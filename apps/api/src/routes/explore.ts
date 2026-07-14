import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { schema } from "@repo/db";
import { ApiError, exploreQuerySchema, type ListGenerationsResponse } from "@repo/shared";
import { db } from "../db";
import { requireSession } from "../middleware/session";
import { parse } from "../lib/validate";
import { loadGenerationAssets, serializeGeneration } from "../lib/serialize";
import { encodeCursor, decodeCursor } from "../lib/cursor";

export const exploreRoutes = new Hono();

exploreRoutes.get("/explore", requireSession, async (c) => {
  const query = parse(exploreQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });

  const conditions = [
    eq(schema.generations.status, "succeeded"),
    eq(schema.generations.isPublic, true),
    sql`${schema.generations.deletedAt} is null`,
  ];
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
