import { afterEach, describe, expect, test } from "bun:test";
import { schema } from "@repo/db";
import { DEFAULT_MODEL_SLUG, getCreditsCost } from "@repo/shared";
import { createApp } from "../src/app";
import { db } from "../src/db";
import { createTestUser, deleteTestUser } from "./helpers";

const app = createApp();
const COST = getCreditsCost(DEFAULT_MODEL_SLUG, 5)!;

async function insertGeneration(opts: {
  userId: string;
  status: "queued" | "processing" | "succeeded" | "failed" | "canceled";
  isPublic: boolean;
  prompt: string;
}) {
  const [row] = await db
    .insert(schema.generations)
    .values({
      userId: opts.userId,
      status: opts.status,
      prompt: opts.prompt,
      model: DEFAULT_MODEL_SLUG,
      provider: "mock",
      aspectRatio: "16:9",
      durationSecs: 5,
      creditsCost: COST,
      isPublic: opts.isPublic,
    })
    .returning();
  return row!;
}

describe("public (unauthenticated) route access", () => {
  const createdUsers: string[] = [];
  afterEach(async () => {
    while (createdUsers.length > 0) {
      await deleteTestUser(createdUsers.pop()!).catch(() => undefined);
    }
  });
  async function freshUser() {
    const userId = await createTestUser();
    createdUsers.push(userId);
    return userId;
  }

  test("GET /api/v1/explore succeeds with no session cookie", async () => {
    const res = await app.request("/api/v1/explore");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; nextCursor: string | null };
    expect(Array.isArray(body.items)).toBe(true);
  });

  test("GET /api/v1/presets succeeds with no session cookie and returns the full catalog", async () => {
    const res = await app.request("/api/v1/presets");
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body.length).toBe(20);
  });

  test("GET /api/v1/models succeeds with no session cookie", async () => {
    const res = await app.request("/api/v1/models");
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body.length).toBeGreaterThan(0);
  });

  test("GET /api/v1/models includes the replicate minimax/video-01 catalog entry", async () => {
    const res = await app.request("/api/v1/models");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ slug: string }>;
    expect(body.some((m) => m.slug === "minimax/video-01")).toBe(true);
  });

  test("a session-gated route (GET /api/v1/generations) still returns 401 with no session cookie", async () => {
    const res = await app.request("/api/v1/generations");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("anonymous /explore only ever returns succeeded + is_public generations, and never leaks user identity", async () => {
    const userId = await freshUser();
    const visible = await insertGeneration({
      userId,
      status: "succeeded",
      isPublic: true,
      prompt: "the one that should be visible",
    });
    await insertGeneration({ userId, status: "succeeded", isPublic: false, prompt: "private succeeded" });
    await insertGeneration({ userId, status: "queued", isPublic: true, prompt: "public but not done" });
    await insertGeneration({ userId, status: "failed", isPublic: true, prompt: "public but failed" });

    const res = await app.request("/api/v1/explore");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string; prompt: string; [key: string]: unknown }>;
    };

    const ids = body.items.map((item) => item.id);
    expect(ids).toContain(visible.id);

    // None of the other three (private, queued, failed) should ever appear.
    const leakedPrompts = ["private succeeded", "public but not done", "public but failed"];
    expect(body.items.some((item) => leakedPrompts.includes(item.prompt as string))).toBe(false);

    for (const item of body.items) {
      expect(item).not.toHaveProperty("userId");
      expect(item).not.toHaveProperty("email");
      expect(item).not.toHaveProperty("user");
    }
  });
});
