import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { schema } from "@repo/db";
import {
  ApiError,
  confirmUploadRequestSchema,
  presignUploadRequestSchema,
  type PresignUploadResponse,
} from "@repo/shared";
import { db } from "../db";
import { requireSession } from "../middleware/session";
import { parse } from "../lib/validate";
import { presignPutUrl } from "../lib/s3";
import { BUCKET } from "../lib/s3";
import { extFromMimeType, faceSourceKey, sourceImageKey } from "../lib/object-keys";
import { serializeMediaAsset } from "../lib/serialize";

export const uploadRoutes = new Hono();

uploadRoutes.post("/uploads/presign", requireSession, async (c) => {
  const session = c.get("session");
  const body = parse(presignUploadRequestSchema, await c.req.json());
  const ext = extFromMimeType(body.mimeType);
  const objectKey =
    body.kind === "face_source"
      ? faceSourceKey(session.user.id, ext)
      : sourceImageKey(session.user.id, ext);
  const uploadUrl = await presignPutUrl(objectKey, body.mimeType);
  const response: PresignUploadResponse = { uploadUrl, objectKey };
  return c.json(response);
});

uploadRoutes.post("/uploads/confirm", requireSession, async (c) => {
  const session = c.get("session");
  const body = parse(confirmUploadRequestSchema, await c.req.json());

  const userPrefix = `${session.user.id}/`;
  let kind: "source_image" | "face_source";
  if (body.objectKey.startsWith("sources/") && body.objectKey.includes(userPrefix)) {
    kind = "source_image";
  } else if (body.objectKey.startsWith("faces/") && body.objectKey.includes(userPrefix)) {
    kind = "face_source";
  } else {
    throw new ApiError("VALIDATION_ERROR", "objectKey does not belong to this user", 400);
  }

  const [row] = await db
    .insert(schema.mediaAssets)
    .values({
      userId: session.user.id,
      kind,
      bucket: BUCKET,
      objectKey: body.objectKey,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      width: body.width ?? null,
      height: body.height ?? null,
    })
    .returning();

  if (!row) {
    throw new ApiError("INTERNAL_ERROR", "Failed to record uploaded media", 500);
  }

  return c.json(await serializeMediaAsset(row), 201);
});

// Used internally by generation creation to make sure a referenced
// sourceImageId really belongs to the caller.
export async function getOwnedSourceImage(userId: string, mediaAssetId: string) {
  const [row] = await db
    .select()
    .from(schema.mediaAssets)
    .where(eq(schema.mediaAssets.id, mediaAssetId));
  if (!row || row.userId !== userId || row.kind !== "source_image") {
    return null;
  }
  return row;
}
