import { z } from "zod";

export const aspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);
export const mediaKindSchema = z.enum([
  "source_image",
  "video",
  "thumbnail",
  "face_source",
]);
export const generationStatusSchema = z.enum([
  "queued",
  "processing",
  "succeeded",
  "failed",
  "canceled",
]);
export type GenerationStatus = z.infer<typeof generationStatusSchema>;
export const ledgerReasonSchema = z.enum([
  "signup_grant",
  "generation",
  "refund",
  "admin_grant",
]);
export const faceProfileStatusSchema = z.enum(["pending", "ready", "failed"]);

// ---- /me ----
export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  credits: z.number(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

// ---- /uploads ----
export const presignUploadRequestSchema = z.object({
  mimeType: z.string().refine((v) => v.startsWith("image/"), {
    message: "Only image uploads are supported",
  }),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024, {
    message: "File exceeds the 10 MB limit",
  }),
  // 'source_image' (start-image for a generation) or 'face_source' (face
  // profile photo). Defaults to 'source_image'.
  kind: z.enum(["source_image", "face_source"]).optional().default("source_image"),
});
export type PresignUploadRequest = z.infer<typeof presignUploadRequestSchema>;

export const presignUploadResponseSchema = z.object({
  uploadUrl: z.string(),
  objectKey: z.string(),
});
export type PresignUploadResponse = z.infer<typeof presignUploadResponseSchema>;

export const confirmUploadRequestSchema = z.object({
  objectKey: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type ConfirmUploadRequest = z.infer<typeof confirmUploadRequestSchema>;

export const mediaAssetResponseSchema = z.object({
  id: z.string(),
  kind: mediaKindSchema,
  mimeType: z.string(),
  sizeBytes: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  durationMs: z.number().nullable(),
  url: z.string(),
  createdAt: z.string(),
});
export type MediaAssetResponse = z.infer<typeof mediaAssetResponseSchema>;

// ---- /generations ----
export const createGenerationRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  motionPreset: z.string().nullable().optional(),
  model: z.string(),
  aspectRatio: aspectRatioSchema,
  durationSecs: z.union([z.literal(5), z.literal(10)]),
  sourceImageId: z.string().uuid().nullable().optional(),
  isPublic: z.boolean().optional().default(true),
});
export type CreateGenerationRequest = z.infer<typeof createGenerationRequestSchema>;

export const generationResponseSchema = z.object({
  id: z.string(),
  status: generationStatusSchema,
  prompt: z.string(),
  enhancedPrompt: z.string().nullable(),
  motionPreset: z.string().nullable(),
  model: z.string(),
  provider: z.enum(["fal", "mock", "replicate"]),
  aspectRatio: aspectRatioSchema,
  durationSecs: z.number(),
  creditsCost: z.number(),
  sourceImageUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  isPublic: z.boolean(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type GenerationResponse = z.infer<typeof generationResponseSchema>;

export const listGenerationsQuerySchema = z.object({
  cursor: z.string().optional(),
  status: generationStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type ListGenerationsQuery = z.infer<typeof listGenerationsQuerySchema>;

export const listGenerationsResponseSchema = z.object({
  items: z.array(generationResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListGenerationsResponse = z.infer<typeof listGenerationsResponseSchema>;

export const patchGenerationRequestSchema = z.object({
  isPublic: z.boolean(),
});
export type PatchGenerationRequest = z.infer<typeof patchGenerationRequestSchema>;

export const exploreQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type ExploreQuery = z.infer<typeof exploreQuerySchema>;

// ---- /face-profiles ----
export const createFaceProfileRequestSchema = z.object({
  name: z.string().min(1).max(100),
  imageIds: z.array(z.string().uuid()).min(1).max(10),
});
export type CreateFaceProfileRequest = z.infer<typeof createFaceProfileRequestSchema>;

export const faceProfileResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: faceProfileStatusSchema,
  images: z.array(z.object({ id: z.string(), url: z.string() })),
  createdAt: z.string(),
});
export type FaceProfileResponse = z.infer<typeof faceProfileResponseSchema>;

// ---- generic error ----
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
