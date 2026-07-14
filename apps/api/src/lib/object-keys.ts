import { randomUUID } from "node:crypto";

export function sourceImageKey(userId: string, ext: string): string {
  return `sources/${userId}/${randomUUID()}.${ext}`;
}

export function videoKey(userId: string, generationId: string): string {
  return `videos/${userId}/${generationId}.mp4`;
}

export function thumbnailKey(userId: string, generationId: string): string {
  return `thumbs/${userId}/${generationId}.jpg`;
}

// Spec's illustrative layout nests these under a face-profile id
// (`faces/{userId}/{profileId}/{uuid}.jpg`); we upload before a profile
// exists to attach to, so the profile segment is omitted here. The
// face_profile_images join table is still the source of truth for which
// profile owns which image.
export function faceSourceKey(userId: string, ext: string): string {
  return `faces/${userId}/${randomUUID()}.${ext}`;
}

export function extFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] ?? "bin";
}
