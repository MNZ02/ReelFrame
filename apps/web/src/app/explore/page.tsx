"use client";

import { useState } from "react";
import Link from "next/link";
import type { GenerationResponse } from "@repo/shared";
import { useMe } from "@/lib/hooks/use-me";
import { useExplore } from "@/lib/hooks/use-explore";
import { ExploreCard } from "@/components/explore/explore-card";
import { ExploreDetailDialog } from "@/components/explore/explore-detail-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function ExplorePage() {
  const { isAuthenticated, sessionPending } = useMe();
  const { data, isLoading } = useExplore(isAuthenticated);
  const [selected, setSelected] = useState<GenerationResponse | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Public generations from the community. Click one to see its prompt and settings.
        </p>
      </div>

      {!sessionPending && !isAuthenticated ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">Sign in to browse the public Explore feed.</p>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      ) : isLoading ? (
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
