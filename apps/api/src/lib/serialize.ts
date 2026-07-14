import { inArray } from "drizzle-orm";
import { schema, type DbOrTx } from "@repo/db";
import type { GenerationResponse, MediaAssetResponse } from "@repo/shared";
import { presignGetUrl } from "./s3";

type MediaAssetRow = typeof schema.mediaAssets.$inferSelect;
type GenerationRow = typeof schema.generations.$inferSelect;

export async function serializeMediaAsset(row: MediaAssetRow): Promise<MediaAssetResponse> {
  const url = await presignGetUrl(row.objectKey);
  return {
    id: row.id,
    kind: row.kind,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    url,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Loads the (up to 3) media assets a generation references, keyed by id. */
export async function loadGenerationAssets(
  db: DbOrTx,
  generation: GenerationRow,
): Promise<Map<string, MediaAssetRow>> {
  const ids = [generation.sourceImageId, generation.videoAssetId, generation.thumbnailId].filter(
    (id): id is string => Boolean(id),
  );
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(schema.mediaAssets).where(inArray(schema.mediaAssets.id, ids));
  return new Map(rows.map((row) => [row.id, row]));
}

export async function serializeGeneration(
  row: GenerationRow,
  assetsById: Map<string, MediaAssetRow>,
): Promise<GenerationResponse> {
  const source = row.sourceImageId ? assetsById.get(row.sourceImageId) : undefined;
  const video = row.videoAssetId ? assetsById.get(row.videoAssetId) : undefined;
  const thumb = row.thumbnailId ? assetsById.get(row.thumbnailId) : undefined;

  const [sourceImageUrl, videoUrl, thumbnailUrl] = await Promise.all([
    source ? presignGetUrl(source.objectKey) : Promise.resolve(null),
    video ? presignGetUrl(video.objectKey) : Promise.resolve(null),
    thumb ? presignGetUrl(thumb.objectKey) : Promise.resolve(null),
  ]);

  return {
    id: row.id,
    status: row.status,
    prompt: row.prompt,
    enhancedPrompt: row.enhancedPrompt,
    motionPreset: row.motionPreset,
    model: row.model,
    provider: row.provider,
    aspectRatio: row.aspectRatio,
    durationSecs: row.durationSecs,
    creditsCost: row.creditsCost,
    sourceImageUrl,
    videoUrl,
    thumbnailUrl,
    isPublic: row.isPublic,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export async function serializeGenerationRow(
  db: DbOrTx,
  row: GenerationRow,
): Promise<GenerationResponse> {
  const assets = await loadGenerationAssets(db, row);
  return serializeGeneration(row, assets);
}
