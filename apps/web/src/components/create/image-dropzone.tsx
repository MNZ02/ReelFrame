"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { MediaAssetResponse } from "@repo/shared";
import { cn } from "@/lib/utils";
import { useUploadImage } from "@/lib/hooks/use-upload";

export function ImageDropzone({
  value,
  onChange,
}: {
  value: MediaAssetResponse | null;
  onChange: (asset: MediaAssetResponse | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds the 10 MB limit");
      return;
    }
    try {
      const asset = await upload.mutateAsync({ file, kind: "source_image" });
      onChange(asset);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  if (value) {
    return (
      <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value.url} alt="Start frame" className="size-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black/90"
          aria-label="Remove image"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        void handleFile(e.dataTransfer.files[0]);
      }}
      className={cn(
        "flex aspect-video w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground transition-colors hover:border-primary/60",
        isDragging && "border-primary bg-primary/5 text-foreground",
      )}
    >
      {upload.isPending ? (
        <Loader2 className="size-6 animate-spin" />
      ) : (
        <>
          <ImagePlus className="size-6" />
          <span>Drag & drop a start image, or click to browse</span>
          <span className="text-xs">Optional · JPG/PNG/WebP, up to 10 MB</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
