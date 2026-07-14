import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { schema } from "@repo/db";
import type { VideoProviderPollResult } from "@repo/shared";
import { db } from "./db";
import { selectProvider } from "./providers";
import { MOCK_SAMPLE_URL } from "./providers/mock";
import { presignGetUrl, putObject, BUCKET } from "./lib/s3";
import { videoKey, thumbnailKey } from "./lib/object-keys";
import { extractThumbnail } from "./lib/ffmpeg";

const POLL_INTERVAL_MS = 5_000;
const JOB_TIMEOUT_MS = 15 * 60 * 1000;
const SAMPLE_MP4_PATH = path.join(import.meta.dir, "..", "assets", "sample.mp4");

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "canceled"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs the generation pipeline exactly as product-spec §Generation pipeline
 * describes: processing -> provider.submit -> poll every 5s (15 min
 * timeout) -> download to MinIO -> best-effort ffmpeg thumbnail -> succeeded,
 * or terminal failure -> refund. Safe to call again for the same
 * generationId (e.g. a pg-boss retry after a transient error) as long as
 * the generation hasn't already reached a terminal status.
 */
export async function processGeneration(generationId: string): Promise<void> {
  const [generation] = await db
    .select()
    .from(schema.generations)
    .where(eq(schema.generations.id, generationId));

  if (!generation) {
    console.warn(`[worker] generation ${generationId} not found, skipping`);
    return;
  }
  if (TERMINAL_STATUSES.has(generation.status)) {
    console.log(`[worker] generation ${generationId} already ${generation.status}, skipping`);
    return;
  }

  await db
    .update(schema.generations)
    .set({ status: "processing", startedAt: generation.startedAt ?? new Date() })
    .where(eq(schema.generations.id, generationId));

  const provider = selectProvider(generation.provider);

  let sourceImageUrl: string | undefined;
  if (generation.sourceImageId) {
    const [asset] = await db
      .select()
      .from(schema.mediaAssets)
      .where(eq(schema.mediaAssets.id, generation.sourceImageId));
    if (asset) sourceImageUrl = await presignGetUrl(asset.objectKey);
  }

  const { providerJobId } = await provider.submit({
    prompt: generation.enhancedPrompt ?? generation.prompt,
    sourceImageUrl,
    aspectRatio: generation.aspectRatio,
    durationSecs: generation.durationSecs,
    model: generation.model,
  });

  await db
    .update(schema.generations)
    .set({ providerJobId })
    .where(eq(schema.generations.id, generationId));

  const deadline = Date.now() + JOB_TIMEOUT_MS;
  let result: VideoProviderPollResult | null = null;
  while (Date.now() < deadline) {
    result = await provider.poll(providerJobId);
    if (result.status === "succeeded" || result.status === "failed") break;
    await sleep(POLL_INTERVAL_MS);
  }

  if (!result) {
    await failGeneration(generationId, generation.userId, generation.creditsCost, "Generation timed out");
    return;
  }
  if (result.status !== "succeeded") {
    const message = result.status === "failed" ? result.error : "Generation timed out";
    await failGeneration(generationId, generation.userId, generation.creditsCost, message);
    return;
  }

  const videoBuffer = await downloadVideo(result.videoUrl);
  const vKey = videoKey(generation.userId, generationId);
  await putObject(vKey, videoBuffer, "video/mp4");
  const [videoAsset] = await db
    .insert(schema.mediaAssets)
    .values({
      userId: generation.userId,
      kind: "video",
      bucket: BUCKET,
      objectKey: vKey,
      mimeType: "video/mp4",
      sizeBytes: videoBuffer.byteLength,
    })
    .returning();

  let thumbnailAssetId: string | null = null;
  let tmpDir: string | null = null;
  try {
    tmpDir = await mkdtemp(path.join(tmpdir(), "higgsfield-"));
    const videoPath = path.join(tmpDir, "video.mp4");
    const thumbPath = path.join(tmpDir, "thumb.jpg");
    await writeFile(videoPath, videoBuffer);
    const ok = await extractThumbnail(videoPath, thumbPath);
    if (ok) {
      const thumbBuffer = await readFile(thumbPath);
      const tKey = thumbnailKey(generation.userId, generationId);
      await putObject(tKey, thumbBuffer, "image/jpeg");
      const [thumbAsset] = await db
        .insert(schema.mediaAssets)
        .values({
          userId: generation.userId,
          kind: "thumbnail",
          bucket: BUCKET,
          objectKey: tKey,
          mimeType: "image/jpeg",
          sizeBytes: thumbBuffer.byteLength,
        })
        .returning();
      thumbnailAssetId = thumbAsset?.id ?? null;
    } else {
      console.warn(`[worker] thumbnail generation failed for ${generationId}, continuing without one`);
    }
  } catch (err) {
    console.warn(`[worker] thumbnail step errored for ${generationId}, continuing without one`, err);
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }

  await db
    .update(schema.generations)
    .set({
      status: "succeeded",
      videoAssetId: videoAsset!.id,
      thumbnailId: thumbnailAssetId,
      completedAt: new Date(),
    })
    .where(eq(schema.generations.id, generationId));
}

// Exported for unit testing; also the terminal path from processGeneration.
export async function failGeneration(
  generationId: string,
  userId: string,
  creditsCost: number,
  errorMessage: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(schema.generations)
      .set({ status: "failed", errorMessage, completedAt: new Date() })
      .where(eq(schema.generations.id, generationId));
    await tx.insert(schema.creditLedger).values({
      userId,
      delta: creditsCost,
      reason: "refund",
      generationId,
    });
  });
}

async function downloadVideo(videoUrl: string): Promise<Buffer> {
  if (videoUrl === MOCK_SAMPLE_URL) {
    return readFile(SAMPLE_MP4_PATH);
  }
  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`Failed to download generated video: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
