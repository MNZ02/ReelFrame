import { afterEach, describe, expect, test } from "bun:test";
import { createGenerationRequestSchema, DEFAULT_MODEL_SLUG, getCreditsCost } from "@repo/shared";
import { db } from "../src/db";
import { schema } from "@repo/db";
import { eq } from "drizzle-orm";
import { createGeneration } from "../src/lib/create-generation";
import { createTestUser, deleteTestUser, grantCredits } from "./helpers";

describe("POST /generations request validation (zod schema)", () => {
  test("accepts a well-formed request", () => {
    const result = createGenerationRequestSchema.safeParse({
      prompt: "a cat riding a skateboard",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: 5,
    });
    expect(result.success).toBe(true);
  });

  test("rejects an empty prompt", () => {
    const result = createGenerationRequestSchema.safeParse({
      prompt: "",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: 5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects a prompt over 2000 characters", () => {
    const result = createGenerationRequestSchema.safeParse({
      prompt: "a".repeat(2001),
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: 5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects an invalid aspect ratio", () => {
    const result = createGenerationRequestSchema.safeParse({
      prompt: "valid prompt",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "4:3",
      durationSecs: 5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects a duration that isn't 5 or 10", () => {
    const result = createGenerationRequestSchema.safeParse({
      prompt: "valid prompt",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: 7,
    });
    expect(result.success).toBe(false);
  });

  test("rejects a missing model", () => {
    const result = createGenerationRequestSchema.safeParse({
      prompt: "valid prompt",
      aspectRatio: "16:9",
      durationSecs: 5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects a non-uuid sourceImageId", () => {
    const result = createGenerationRequestSchema.safeParse({
      prompt: "valid prompt",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: 5,
      sourceImageId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  test("defaults isPublic to true when omitted", () => {
    const result = createGenerationRequestSchema.safeParse({
      prompt: "valid prompt",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublic).toBe(true);
    }
  });
});

describe("createGeneration business-rule validation (catalog, not shape)", () => {
  const createdUsers: string[] = [];
  afterEach(async () => {
    while (createdUsers.length > 0) {
      await deleteTestUser(createdUsers.pop()!).catch(() => undefined);
    }
  });
  async function freshUser(credits: number) {
    const userId = await createTestUser();
    createdUsers.push(userId);
    if (credits > 0) await grantCredits(userId, credits);
    return userId;
  }

  test("rejects an unknown model", async () => {
    const userId = await freshUser(1000);
    await expect(
      createGeneration({
        userId,
        prompt: "test",
        model: "not-a-real-model",
        aspectRatio: "16:9",
        durationSecs: 5,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  test("rejects a duration the model doesn't support", async () => {
    const userId = await freshUser(1000);
    await expect(
      createGeneration({
        userId,
        prompt: "test",
        model: DEFAULT_MODEL_SLUG,
        aspectRatio: "16:9",
        durationSecs: 7 as unknown as 5,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  test("rejects a sourceImageId that doesn't belong to the caller", async () => {
    const userId = await freshUser(1000);
    await expect(
      createGeneration({
        userId,
        prompt: "test",
        model: DEFAULT_MODEL_SLUG,
        aspectRatio: "16:9",
        durationSecs: 5,
        sourceImageId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  test("valid request creates exactly one queued generation with the catalog cost", async () => {
    const userId = await freshUser(1000);
    const cost = getCreditsCost(DEFAULT_MODEL_SLUG, 5)!;
    const generation = await createGeneration({
      userId,
      prompt: "test",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs: 5,
    });
    expect(generation.status).toBe("queued");
    expect(generation.creditsCost).toBe(cost);

    const rows = await db.select().from(schema.generations).where(eq(schema.generations.userId, userId));
    expect(rows).toHaveLength(1);
  });
});
