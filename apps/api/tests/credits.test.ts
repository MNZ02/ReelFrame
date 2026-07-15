import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { schema } from "@repo/db";
import { ApiError, DEFAULT_MODEL_SLUG, getCreditsCost } from "@repo/shared";
import { db } from "../src/db";
import { getBalance } from "../src/lib/credits";
import { createGeneration } from "../src/lib/create-generation";
import { cancelGeneration } from "../src/lib/cancel-generation";
import { failGeneration, handleExhaustedRetries, isFinalAttempt } from "../src/pipeline";
import { createTestUser, deleteTestUser, grantCredits } from "./helpers";

const DURATION_SECS = 5;
const COST = getCreditsCost(DEFAULT_MODEL_SLUG, DURATION_SECS)!;

const createdUsers: string[] = [];

afterEach(async () => {
  while (createdUsers.length > 0) {
    const userId = createdUsers.pop()!;
    await deleteTestUser(userId).catch(() => undefined);
  }
});

async function freshUser(initialCredits: number): Promise<string> {
  const userId = await createTestUser();
  createdUsers.push(userId);
  if (initialCredits > 0) {
    await grantCredits(userId, initialCredits);
  }
  return userId;
}

describe("credit ledger", () => {
  test("grant increases balance", async () => {
    const userId = await freshUser(0);
    await grantCredits(userId, 100);
    expect(await getBalance(db, userId)).toBe(100);
  });

  test("spend: creating a generation debits the exact cost", async () => {
    const userId = await freshUser(50);
    const generation = await createGeneration({
      userId,
      prompt: "a test prompt",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: DURATION_SECS,
    });
    expect(generation.status).toBe("queued");
    expect(generation.creditsCost).toBe(COST);
    expect(await getBalance(db, userId)).toBe(50 - COST);
  });

  test("insufficient credits: 402 INSUFFICIENT_CREDITS, no generation row, no ledger row", async () => {
    const userId = await freshUser(COST - 1);

    await expect(
      createGeneration({
        userId,
        prompt: "should fail",
        model: DEFAULT_MODEL_SLUG,
        aspectRatio: "16:9",
        durationSecs: DURATION_SECS,
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_CREDITS", status: 402 });

    const generations = await db.select().from(schema.generations).where(eq(schema.generations.userId, userId));
    expect(generations).toHaveLength(0);

    // Only the initial admin_grant ledger row should exist — no debit, no refund.
    const ledgerRows = await db.select().from(schema.creditLedger).where(eq(schema.creditLedger.userId, userId));
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0]!.reason).toBe("admin_grant");
    expect(await getBalance(db, userId)).toBe(COST - 1);
  });

  test("refund: canceling a queued generation restores the cost", async () => {
    const userId = await freshUser(COST);
    const generation = await createGeneration({
      userId,
      prompt: "cancel me",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: DURATION_SECS,
    });
    expect(await getBalance(db, userId)).toBe(0);

    const canceled = await cancelGeneration(userId, generation.id);
    expect(canceled.status).toBe("canceled");
    expect(await getBalance(db, userId)).toBe(COST);
  });

  test("refund: a terminal provider failure refunds and stores error_message", async () => {
    const userId = await freshUser(COST);
    const generation = await createGeneration({
      userId,
      prompt: "will fail in the provider",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: DURATION_SECS,
    });
    expect(await getBalance(db, userId)).toBe(0);

    await failGeneration(generation.id, userId, generation.creditsCost, "provider exploded");

    const [row] = await db.select().from(schema.generations).where(eq(schema.generations.id, generation.id));
    expect(row!.status).toBe("failed");
    expect(row!.errorMessage).toBe("provider exploded");
    expect(await getBalance(db, userId)).toBe(COST);
  });

  test("refund: retry exhaustion (transient errors) marks failed and refunds, exactly like a timeout", async () => {
    const userId = await freshUser(COST);
    const generation = await createGeneration({
      userId,
      prompt: "will keep throwing transient errors",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: DURATION_SECS,
    });
    expect(await getBalance(db, userId)).toBe(0);

    // Simulate what processGeneration does before a transient error: the
    // generation is left in `processing`, mid-flight, when the worker's
    // final retry attempt throws.
    await db
      .update(schema.generations)
      .set({ status: "processing", startedAt: new Date() })
      .where(eq(schema.generations.id, generation.id));

    await handleExhaustedRetries(generation.id, new Error("S3 put failed after retries"));

    const [row] = await db.select().from(schema.generations).where(eq(schema.generations.id, generation.id));
    expect(row!.status).toBe("failed");
    // Raw internal error text must NOT reach the user-facing error_message —
    // a plain Error becomes a clean generic message.
    expect(row!.errorMessage).not.toContain("S3 put");
    expect(row!.errorMessage).toContain("Generation failed after several attempts");
    expect(await getBalance(db, userId)).toBe(COST);
  });

  test("refund: retry exhaustion surfaces a ProviderError's clean user message", async () => {
    const userId = await freshUser(COST);
    const generation = await createGeneration({
      userId,
      prompt: "provider ran out of quota",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: DURATION_SECS,
    });
    await db
      .update(schema.generations)
      .set({ status: "processing", startedAt: new Date() })
      .where(eq(schema.generations.id, generation.id));

    const { ProviderError } = await import("../src/providers/provider-error");
    await handleExhaustedRetries(
      generation.id,
      new ProviderError("Replicate free usage limit reached. Add billing on Replicate.", {
        terminal: false,
        status: 429,
      }),
    );

    const [row] = await db.select().from(schema.generations).where(eq(schema.generations.id, generation.id));
    expect(row!.status).toBe("failed");
    expect(row!.errorMessage).toBe("Replicate free usage limit reached. Add billing on Replicate.");
    expect(await getBalance(db, userId)).toBe(COST);
  });

  test("refund: retry exhaustion is idempotent — no double refund if already terminal", async () => {
    const userId = await freshUser(COST);
    const generation = await createGeneration({
      userId,
      prompt: "already handled elsewhere",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: DURATION_SECS,
    });

    // Generation already reached a terminal state (e.g. it actually
    // succeeded, or the timeout path already refunded it) before the
    // worker's final-attempt catch block ran.
    await failGeneration(generation.id, userId, generation.creditsCost, "already failed once");
    expect(await getBalance(db, userId)).toBe(COST);

    await handleExhaustedRetries(generation.id, new Error("late duplicate error"));

    // Balance must not have been refunded a second time.
    expect(await getBalance(db, userId)).toBe(COST);
    const [row] = await db.select().from(schema.generations).where(eq(schema.generations.id, generation.id));
    expect(row!.errorMessage).toBe("already failed once");
  });

  test("isFinalAttempt: true only once retryCount has caught up to retryLimit", () => {
    expect(isFinalAttempt({ retryCount: 0, retryLimit: 2 })).toBe(false);
    expect(isFinalAttempt({ retryCount: 1, retryLimit: 2 })).toBe(false);
    expect(isFinalAttempt({ retryCount: 2, retryLimit: 2 })).toBe(true);
    expect(isFinalAttempt({ retryCount: 3, retryLimit: 2 })).toBe(true);
    expect(isFinalAttempt({ retryCount: 0, retryLimit: 0 })).toBe(true);
  });

  test("concurrent double-spend is prevented: balance never goes negative", async () => {
    const userId = await freshUser(COST); // exactly enough for ONE generation

    const attempt = () =>
      createGeneration({
        userId,
        prompt: "race",
        model: DEFAULT_MODEL_SLUG,
        aspectRatio: "16:9",
        durationSecs: DURATION_SECS,
      });

    const results = await Promise.allSettled([attempt(), attempt()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectedReason).toBeInstanceOf(ApiError);
    expect((rejectedReason as ApiError).code).toBe("INSUFFICIENT_CREDITS");

    const balance = await getBalance(db, userId);
    expect(balance).toBe(0);
    expect(balance).toBeGreaterThanOrEqual(0);

    const generations = await db.select().from(schema.generations).where(eq(schema.generations.userId, userId));
    expect(generations).toHaveLength(1);
  });
});
