"use client";

import { useState } from "react";
import type { GenerationStatus } from "@repo/shared";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LibraryCard } from "@/components/library/library-card";
import { useGenerations } from "@/lib/hooks/use-generations";

const FILTERS: Array<{ value: GenerationStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
];

export default function LibraryPage() {
  const [filter, setFilter] = useState<GenerationStatus | "all">("all");
  const { data, isLoading } = useGenerations(filter === "all" ? undefined : filter);
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as GenerationStatus | "all")}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No generations {filter !== "all" ? `with status "${filter}"` : "yet"} — head to Create to
          make your first one.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((generation) => (
            <LibraryCard key={generation.id} generation={generation} />
          ))}
        </div>
      )}
    </div>
  );
}
