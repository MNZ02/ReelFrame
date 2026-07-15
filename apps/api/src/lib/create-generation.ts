import { schema } from "@repo/db";
import {
  ApiError,
  getCreditsCost,
  getModel,
  isModelAvailableForProvider,
  type AspectRatio,
} from "@repo/shared";
import { db } from "../db";
import { env } from "../env";
import { getBalance, lockUserForCredits } from "./credits";
import { getOwnedSourceImage } from "../routes/uploads";
import { enhancePrompt } from "./prompt-enhancer";
import { getBoss, GENERATION_QUEUE } from "../queue";

export interface CreateGenerationInput {
  userId: string;
  prompt: string;
  negativePrompt?: string | null;
  motionPreset?: string | null;
  model: string;
  aspectRatio: AspectRatio;
  durationSecs: number;
  sourceImageId?: string | null;
  isPublic?: boolean;
}

type GenerationRow = typeof schema.generations.$inferSelect;

/**
 * Single serializable transaction: balance check -> insert generation
 * (queued) -> ledger debit. Throws ApiError('INSUFFICIENT_CREDITS', ..., 402)
 * and rolls back (no generation row, no ledger row) when the balance is too
 * low. Enqueues the pg-boss job only after the transaction commits.
 */
export async function createGeneration(input: CreateGenerationInput): Promise<GenerationRow> {
  const modelInfo = getModel(input.model);
  if (!modelInfo) {
    throw new ApiError("VALIDATION_ERROR", `Unknown model: ${input.model}`, 400);
  }
  if (!isModelAvailableForProvider(input.model, env.VIDEO_PROVIDER)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Model ${input.model} is not available with the active video provider (${env.VIDEO_PROVIDER})`,
      400,
    );
  }
  if (!modelInfo.supportedAspectRatios.includes(input.aspectRatio)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Model ${input.model} does not support aspect ratio ${input.aspectRatio}`,
      400,
    );
  }
  const cost = getCreditsCost(input.model, input.durationSecs);
  if (cost === undefined) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Model ${input.model} does not support duration ${input.durationSecs}s`,
      400,
    );
  }

  if (input.sourceImageId) {
    if (!modelInfo.supportsSourceImage) {
      throw new ApiError("VALIDATION_ERROR", `Model ${input.model} does not accept a source image`, 400);
    }
    // A cloud provider must fetch the source image over the internet; our
    // MinIO is on localhost, so without a public endpoint (tunnel) the
    // provider would get a connection-refused. Fail fast here rather than
    // enqueue a job that can only fail. Mock never fetches the URL.
    if (env.VIDEO_PROVIDER !== "mock" && !env.S3_PUBLIC_ENDPOINT) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Start images require S3_PUBLIC_ENDPOINT to be configured so the video provider can fetch the image. Run a tunnel to MinIO (e.g. cloudflared) and set S3_PUBLIC_ENDPOINT, or generate without a start image.",
        400,
      );
    }
    const asset = await getOwnedSourceImage(input.userId, input.sourceImageId);
    if (!asset) {
      throw new ApiError("NOT_FOUND", "Source image not found", 404);
    }
  }

  const { enhancedPrompt, negativePrompt } = await enhancePrompt({
    prompt: input.prompt,
    motionPreset: input.motionPreset,
    negativePrompt: input.negativePrompt,
  });

  const generation = await db.transaction(
    async (tx) => {
      await lockUserForCredits(tx, input.userId);
      const balance = await getBalance(tx, input.userId);
      if (balance < cost) {
        throw new ApiError("INSUFFICIENT_CREDITS", "Not enough credits for this generation", 402);
      }

      const [row] = await tx
        .insert(schema.generations)
        .values({
          userId: input.userId,
          prompt: input.prompt,
          enhancedPrompt,
          negativePrompt,
          motionPreset: input.motionPreset ?? null,
          model: input.model,
          provider: env.VIDEO_PROVIDER,
          aspectRatio: input.aspectRatio,
          durationSecs: input.durationSecs,
          creditsCost: cost,
          sourceImageId: input.sourceImageId ?? null,
          isPublic: input.isPublic ?? true,
        })
        .returning();

      if (!row) {
        throw new ApiError("INTERNAL_ERROR", "Failed to create generation", 500);
      }

      await tx.insert(schema.creditLedger).values({
        userId: input.userId,
        delta: -cost,
        reason: "generation",
        generationId: row.id,
      });

      return row;
    },
    { isolationLevel: "serializable" },
  );

  try {
    const boss = await getBoss();
    await boss.send(
      GENERATION_QUEUE,
      { generationId: generation.id },
      { expireInSeconds: 20 * 60 },
    );
  } catch (err) {
    console.error("[generations] failed to enqueue job for", generation.id, err);
  }

  return generation;
}
