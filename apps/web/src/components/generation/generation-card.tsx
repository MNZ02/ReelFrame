"use client";

import Link from "next/link";
import { useRef } from "react";
import type { GenerationResponse } from "@repo/shared";
import { StatusBadge } from "@/components/generation/status-badge";
import { cn } from "@/lib/utils";

export function GenerationCard({
  generation,
  className,
}: {
  generation: GenerationResponse;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <Link
      href={`/generations/${generation.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60",
        className,
      )}
    >
      <div
        className="relative aspect-video w-full overflow-hidden bg-muted"
        onMouseEnter={() => videoRef.current?.play().catch(() => {})}
        onMouseLeave={() => {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
        }}
      >
        {generation.videoUrl ? (
          <video
            ref={videoRef}
            src={generation.videoUrl}
            poster={generation.thumbnailUrl ?? undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-secondary/50 p-4 text-center text-xs text-muted-foreground">
            {generation.status === "failed" ? "Generation failed" : "Rendering…"}
          </div>
        )}
        <StatusBadge status={generation.status} className="absolute top-2 right-2" />
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm text-foreground">{generation.prompt}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{generation.motionPreset ?? "No preset"}</span>
          <span>{generation.creditsCost} cr</span>
        </div>
      </div>
    </Link>
  );
}
