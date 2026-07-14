"use client";

import { Loader2 } from "lucide-react";
import { useGenerations } from "@/lib/hooks/use-generations";
import { GenerationCard } from "@/components/generation/generation-card";
import { Skeleton } from "@/components/ui/skeleton";

export function GenerationRail() {
  const { data, isLoading } = useGenerations();
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Recent generations
        </h2>
        {items.some((g) => g.status === "queued" || g.status === "processing") && (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing yet — your first generation will appear here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((generation) => (
            <GenerationCard key={generation.id} generation={generation} />
          ))}
        </div>
      )}
    </div>
  );
}
