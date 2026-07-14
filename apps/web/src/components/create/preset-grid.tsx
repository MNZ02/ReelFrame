"use client";

import type { MotionPreset } from "@repo/shared";
import { cn } from "@/lib/utils";
import { presetThumbnailSrc } from "@/lib/presets";

export function PresetGrid({
  presets,
  selected,
  onSelect,
}: {
  presets: MotionPreset[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground",
          selected === null && "border-primary bg-primary/10 text-foreground",
        )}
      >
        No preset
      </button>
      {presets.map((preset) => {
        const isSelected = selected === preset.slug;
        return (
          <button
            type="button"
            key={preset.slug}
            onClick={() => onSelect(preset.slug)}
            title={preset.promptTemplate}
            className={cn(
              "group relative aspect-video overflow-hidden rounded-lg border-2 border-transparent ring-1 ring-border transition-all hover:ring-primary/60",
              isSelected && "border-primary ring-2 ring-primary",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={presetThumbnailSrc(preset.slug)}
              alt={preset.name}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
              <span className="text-[11px] font-medium text-white">{preset.name}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
