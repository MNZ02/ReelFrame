"use client";

import { useMutation } from "@tanstack/react-query";
import type { MediaAssetResponse, PresignUploadResponse } from "@repo/shared";
import { api } from "@/lib/api";

interface UploadParams {
  file: File;
  kind?: "source_image" | "face_source";
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Presign -> direct PUT to MinIO -> confirm. Returns the resulting media asset (incl. presigned GET url). */
export function useUploadImage() {
  return useMutation({
    mutationFn: async ({ file, kind = "source_image" }: UploadParams): Promise<MediaAssetResponse> => {
      const presign = await api.post<PresignUploadResponse>("/uploads/presign", {
        mimeType: file.type,
        sizeBytes: file.size,
        kind,
      });

      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error("Upload to storage failed. Please try again.");
      }

      const dimensions = await readImageDimensions(file);

      return api.post<MediaAssetResponse>("/uploads/confirm", {
        objectKey: presign.objectKey,
        mimeType: file.type,
        sizeBytes: file.size,
        width: dimensions?.width,
        height: dimensions?.height,
      });
    },
  });
}
