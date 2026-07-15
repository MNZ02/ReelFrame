import sharp from "sharp";
import type { AspectRatio } from "@repo/shared";

// Target pixel dimensions per aspect ratio. Deliberately modest: video models
// downscale internally, and a small upright JPEG uploads to the provider far
// faster than a 20-megapixel phone photo.
const TARGET_DIMS: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "1:1": { width: 1024, height: 1024 },
};

export interface NormalizedImage {
  buffer: Buffer;
  contentType: "image/jpeg";
  width: number;
  height: number;
}

/**
 * Prepare a user-uploaded image to be the first frame handed to a video
 * provider. Phone photos are commonly stored as sideways pixels plus an EXIF
 * orientation flag; browsers honour the flag but video models read raw pixels
 * and ignore it, producing rotated output. So we:
 *   1. `.rotate()` with no args — apply the EXIF orientation and strip the tag
 *      so the pixels themselves are upright.
 *   2. crop to fill the chosen aspect ratio (`attention` keeps the crop on the
 *      busiest region, usually the subjects) so the model gets a clean frame
 *      instead of a near-square 20MP image it may re-orient.
 *   3. re-encode as a capped-resolution JPEG.
 */
export async function normalizeSourceImage(
  input: Buffer,
  aspectRatio: AspectRatio,
): Promise<NormalizedImage> {
  const { width, height } = TARGET_DIMS[aspectRatio];
  const buffer = await sharp(input)
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .jpeg({ quality: 90 })
    .toBuffer();
  return { buffer, contentType: "image/jpeg", width, height };
}
