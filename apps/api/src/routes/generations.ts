import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { schema } from "@repo/db";
import {
  ApiError,
  createGenerationRequestSchema,
  listGenerationsQuerySchema,
  patchGenerationRequestSchema,
  type ListGenerationsResponse,
} from "@repo/shared";
import { db } from "../db";
import { requireSession } from "../middleware/session";
import { parse } from "../lib/validate";
import { createGeneration } from "../lib/create-generation";
import { cancelGeneration } from "../lib/cancel-generation";
import { serializeGenerationRow, loadGenerationAssets, serializeGeneration } from "../lib/serialize";
import { encodeCursor, decodeCursor } from "../lib/cursor";
import { deleteObject } from "../lib/s3";

export const generationRoutes = new Hono();

generationRoutes.post("/generations", requireSession, async (c) => {
  const session = c.get("session");
  const body = parse(createGenerationRequestSchema, await c.req.json());
  const generation = await createGeneration({
    userId: session.user.id,
    prompt: body.prompt,
    motionPreset: body.motionPreset ?? null,
    model: body.model,
    aspectRatio: body.aspectRatio,
    durationSecs: body.durationSecs,
    sourceImageId: body.sourceImageId ?? null,
    isPublic: body.isPublic,
  });
  return c.json(await serializeGenerationRow(db, generation), 201);
});

generationRoutes.get("/generations", requireSession, async (c) => {
  const session = c.get("session");
  const query = parse(listGenerationsQuerySchema, {
    cursor: c.req.query("cursor"),
    status: c.req.query("status"),
    limit: c.req.query("limit"),
  });

  const conditions = [
    eq(schema.generations.userId, session.user.id),
    sql`${schema.generations.deletedAt} is null`,
  ];
  if (query.status) {
    conditions.push(eq(schema.generations.status, query.status));
  }
  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    if (!cursor) {
      throw new ApiError("VALIDATION_ERROR", "Invalid cursor", 400);
    }
    conditions.push(
      sql`(${schema.generations.createdAt}, ${schema.generations.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
    );
  }

  const rows = await db
    .select()
    .from(schema.generations)
    .where(and(...conditions))
    .orderBy(desc(schema.generations.createdAt), desc(schema.generations.id))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const items = await Promise.all(
    page.map(async (row) => serializeGeneration(row, await loadGenerationAssets(db, row))),
  );
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

  const body: ListGenerationsResponse = { items, nextCursor };
  return c.json(body);
});

async function loadOwnGeneration(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(schema.generations)
    .where(and(eq(schema.generations.id, id), eq(schema.generations.userId, userId)));
  if (!row || row.deletedAt) {
    throw new ApiError("NOT_FOUND", "Generation not found", 404);
  }
  return row;
}

function requireIdParam(c: { req: { param: (key: string) => string | undefined } }): string {
  const id = c.req.param("id");
  if (!id) {
    throw new ApiError("VALIDATION_ERROR", "Missing :id path parameter", 400);
  }
  return id;
}

generationRoutes.get("/generations/:id", requireSession, async (c) => {
  const session = c.get("session");
  const row = await loadOwnGeneration(session.user.id, requireIdParam(c));
  return c.json(await serializeGenerationRow(db, row));
});

generationRoutes.post("/generations/:id/cancel", requireSession, async (c) => {
  const session = c.get("session");
  const id = requireIdParam(c);
  const updated = await cancelGeneration(session.user.id, id);

  return c.json(await serializeGenerationRow(db, updated));
});

generationRoutes.patch("/generations/:id", requireSession, async (c) => {
  const session = c.get("session");
  const id = requireIdParam(c);
  const body = parse(patchGenerationRequestSchema, await c.req.json());

  await loadOwnGeneration(session.user.id, id);

  const [updated] = await db
    .update(schema.generations)
    .set({ isPublic: body.isPublic })
    .where(eq(schema.generations.id, id))
    .returning();

  return c.json(await serializeGenerationRow(db, updated!));
});

generationRoutes.delete("/generations/:id", requireSession, async (c) => {
  const session = c.get("session");
  const id = requireIdParam(c);
  const row = await loadOwnGeneration(session.user.id, id);

  const assets = await loadGenerationAssets(db, row);
  await Promise.allSettled(
    [row.videoAssetId, row.thumbnailId]
      .filter((assetId): assetId is string => Boolean(assetId))
      .map((assetId) => assets.get(assetId))
      .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
      .map((asset) => deleteObject(asset.objectKey)),
  );

  await db
    .update(schema.generations)
    .set({ deletedAt: new Date(), isPublic: false })
    .where(eq(schema.generations.id, id));

  return c.json({ success: true });
});
