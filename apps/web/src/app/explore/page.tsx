"use client";

import { useState } from "react";
import type { GenerationResponse } from "@repo/shared";
import { useExplore } from "@/lib/hooks/use-explore";
import { ExploreCard } from "@/components/explore/explore-card";
import { ExploreDetailDialog } from "@/components/explore/explore-detail-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExplorePage() {
  const { data, isLoading } = useExplore();
  const [selected, setSelected] = useState<GenerationResponse | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Public generations from the community. Click one to see its prompt and settings.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <p className="py-16 text-center text-muted-foreground">
          Nothing public yet — be the first to share a generation.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((generation) => (
            <ExploreCard key={generation.id} generation={generation} onOpen={setSelected} />
          ))}
        </div>
      )}

      <ExploreDetailDialog generation={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
