/**
 * Idempotent demo-data seed: creates demo@example.com/password (100 signup
 * credits via the normal better-auth + databaseHooks path) and, the first
 * time it's run, 3 public succeeded generations pointing at the bundled
 * sample MP4 so /explore has something to show out of the box.
 */
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { schema } from "@repo/db";
import { DEFAULT_MODEL_SLUG, getCreditsCost, MOTION_PRESETS } from "@repo/shared";
import { auth } from "../src/auth";
import { db, pool } from "../src/db";
import { putObject, BUCKET } from "../src/lib/s3";
import { videoKey, thumbnailKey } from "../src/lib/object-keys";
import { extractThumbnail } from "../src/lib/ffmpeg";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "password";
const DEMO_NAME = "Demo User";
const SAMPLE_MP4_PATH = path.join(import.meta.dir, "..", "assets", "sample.mp4");

async function ensureDemoUser(): Promise<string> {
  const [existing] = await db.select().from(schema.user).where(eq(schema.user.email, DEMO_EMAIL));
  if (existing) {
    console.log(`[seed] demo user already exists (${existing.id})`);
    return existing.id;
  }

  const result = await auth.api.signUpEmail({
    body: { name: DEMO_NAME, email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  console.log(`[seed] created demo user ${result.user.id} (+100 signup credits)`);
  return result.user.id;
}

async function seedGenerations(userId: string): Promise<void> {
  const existingCount = (
    await db
      .select()
      .from(schema.generations)
      .where(and(eq(schema.generations.userId, userId), eq(schema.generations.status, "succeeded")))
  ).length;

  if (existingCount >= 3) {
    console.log(`[seed] demo user already has ${existingCount} succeeded generations, skipping`);
    return;
  }

  const sampleVideo = await readFile(SAMPLE_MP4_PATH);
  const toCreate = 3 - existingCount;

  for (let i = 0; i < toCreate; i++) {
    const preset = MOTION_PRESETS[i % MOTION_PRESETS.length]!;
    const generationId = randomUUID();
    const model = DEFAULT_MODEL_SLUG;
    const durationSecs = 5;
    const cost = getCreditsCost(model, durationSecs) ?? 10;

    const vKey = videoKey(userId, generationId);
    await putObject(vKey, sampleVideo, "video/mp4");
    const [videoAsset] = await db
      .insert(schema.mediaAssets)
      .values({
        userId,
        kind: "video",
        bucket: BUCKET,
        objectKey: vKey,
        mimeType: "video/mp4",
        sizeBytes: sampleVideo.byteLength,
      })
      .returning();

    let thumbnailId: string | null = null;
    let tmpDir: string | null = null;
    try {
      tmpDir = await mkdtemp(path.join(tmpdir(), "higgsfield-seed-"));
      const videoPath = path.join(tmpDir, "video.mp4");
      const thumbPath = path.join(tmpDir, "thumb.jpg");
      await writeFile(videoPath, sampleVideo);
      const ok = await extractThumbnail(videoPath, thumbPath);
      if (ok) {
        const thumbBuffer = await readFile(thumbPath);
        const tKey = thumbnailKey(userId, generationId);
        await putObject(tKey, thumbBuffer, "image/jpeg");
        const [thumbAsset] = await db
          .insert(schema.mediaAssets)
          .values({
            userId,
            kind: "thumbnail",
            bucket: BUCKET,
            objectKey: tKey,
            mimeType: "image/jpeg",
            sizeBytes: thumbBuffer.byteLength,
          })
          .returning();
        thumbnailId = thumbAsset?.id ?? null;
      }
    } catch (err) {
      console.warn("[seed] thumbnail generation failed, continuing without one", err);
    } finally {
      if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }

    await db.insert(schema.generations).values({
      id: generationId,
      userId,
      status: "succeeded",
      prompt: `A cinematic shot demonstrating the ${preset.name} preset`,
      enhancedPrompt: preset.promptTemplate.replace(
        "{prompt}",
        "a neon-lit city street at night",
      ),
      motionPreset: preset.slug,
      model,
      provider: "mock",
      aspectRatio: "16:9",
      durationSecs,
      creditsCost: cost,
      videoAssetId: videoAsset!.id,
      thumbnailId,
      isPublic: true,
      createdAt: new Date(Date.now() - (toCreate - i) * 60_000),
      startedAt: new Date(Date.now() - (toCreate - i) * 60_000),
      completedAt: new Date(Date.now() - (toCreate - i) * 60_000 + 10_000),
    });
    console.log(`[seed] created public generation ${generationId} (${preset.name})`);
  }
}

async function main() {
  const userId = await ensureDemoUser();
  await seedGenerations(userId);
  console.log("[seed] done");
}

main()
  .catch((err) => {
    console.error("[seed] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
