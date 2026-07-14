"use client";

import { useRef } from "react";
import type { GenerationResponse } from "@repo/shared";

export function ExploreCard({
  generation,
  onOpen,
}: {
  generation: GenerationResponse;
  onOpen: (generation: GenerationResponse) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <button
      type="button"
      onClick={() => onOpen(generation)}
      className="group relative flex aspect-video w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-muted text-left"
      onMouseEnter={() => videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }}
    >
      {generation.videoUrl && (
        <video
          ref={videoRef}
          src={generation.videoUrl}
          poster={generation.thumbnailUrl ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <p className="line-clamp-2 text-xs font-medium text-white">{generation.prompt}</p>
      </div>
    </button>
  );
}
