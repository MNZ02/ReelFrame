import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@repo/db";
import { ApiError, createFaceProfileRequestSchema, type FaceProfileResponse } from "@repo/shared";
import { db } from "../db";
import { requireSession } from "../middleware/session";
import { parse } from "../lib/validate";
import { presignGetUrl } from "../lib/s3";

export const faceProfileRoutes = new Hono();

async function serializeFaceProfile(
  profile: typeof schema.faceProfiles.$inferSelect,
): Promise<FaceProfileResponse> {
  const images = await db
    .select({
      id: schema.faceProfileImages.id,
      objectKey: schema.mediaAssets.objectKey,
    })
    .from(schema.faceProfileImages)
    .innerJoin(schema.mediaAssets, eq(schema.faceProfileImages.mediaAssetId, schema.mediaAssets.id))
    .where(eq(schema.faceProfileImages.faceProfileId, profile.id));

  return {
    id: profile.id,
    name: profile.name,
    status: profile.status,
    images: await Promise.all(
      images.map(async (img) => ({ id: img.id, url: await presignGetUrl(img.objectKey) })),
    ),
    createdAt: profile.createdAt.toISOString(),
  };
}

faceProfileRoutes.post("/face-profiles", requireSession, async (c) => {
  const session = c.get("session");
  const body = parse(createFaceProfileRequestSchema, await c.req.json());

  // Confirm every referenced image belongs to this user and is a face_source
  // asset before attaching it — this is a Phase-1 stub, so no processing
  // happens beyond bookkeeping; status stays 'pending'.
  const images = await db
    .select()
    .from(schema.mediaAssets)
    .where(
      and(
        inArray(schema.mediaAssets.id, body.imageIds),
        eq(schema.mediaAssets.userId, session.user.id),
        eq(schema.mediaAssets.kind, "face_source"),
      ),
    );
  if (images.length !== body.imageIds.length) {
    throw new ApiError("VALIDATION_ERROR", "One or more imageIds are invalid", 400);
  }

  const profile = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.faceProfiles)
      .values({ userId: session.user.id, name: body.name, status: "pending" })
      .returning();
    if (!row) {
      throw new ApiError("INTERNAL_ERROR", "Failed to create face profile", 500);
    }
    await tx.insert(schema.faceProfileImages).values(
      images.map((img) => ({ faceProfileId: row.id, mediaAssetId: img.id })),
    );
    return row;
  });

  return c.json(await serializeFaceProfile(profile), 201);
});

faceProfileRoutes.get("/face-profiles", requireSession, async (c) => {
  const session = c.get("session");
  const rows = await db
    .select()
    .from(schema.faceProfiles)
    .where(eq(schema.faceProfiles.userId, session.user.id));
  return c.json(await Promise.all(rows.map(serializeFaceProfile)));
});
