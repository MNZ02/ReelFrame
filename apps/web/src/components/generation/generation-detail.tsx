"use client";

import { useRouter } from "next/navigation";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/generation/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeneration, useCreateGeneration } from "@/lib/hooks/use-generations";

export function GenerationDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: generation, isLoading } = useGeneration(id);
  const createGeneration = useCreateGeneration();

  async function handleRegenerate() {
    if (!generation) return;
    try {
      const next = await createGeneration.mutateAsync({
        prompt: generation.prompt,
        motionPreset: generation.motionPreset,
        model: generation.model,
        aspectRatio: generation.aspectRatio,
        durationSecs: generation.durationSecs as 5 | 10,
        sourceImageId: null,
        isPublic: generation.isPublic,
      });
      toast.success("Regeneration started");
      router.push(`/generations/${next.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate");
    }
  }

  if (isLoading || !generation) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Skeleton className="aspect-video w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        {generation.videoUrl ? (
          <video
            src={generation.videoUrl}
            poster={generation.thumbnailUrl ?? undefined}
            controls
            autoPlay
            loop
            className="size-full object-contain"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <StatusBadge status={generation.status} />
            {generation.status === "failed" && generation.errorMessage && (
              <p className="max-w-md px-4 text-center text-sm text-destructive">
                {generation.errorMessage}
              </p>
            )}
            {(generation.status === "queued" || generation.status === "processing") && (
              <p className="text-sm">Your video is being generated — this updates automatically.</p>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-foreground">{generation.prompt}</p>
            <StatusBadge status={generation.status} />
          </div>
          {generation.enhancedPrompt && generation.enhancedPrompt !== generation.prompt && (
            <p className="text-xs text-muted-foreground">
              Enhanced prompt: {generation.enhancedPrompt}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {generation.motionPreset && <Badge variant="secondary">{generation.motionPreset}</Badge>}
            <Badge variant="outline">{generation.model}</Badge>
            <Badge variant="outline">{generation.aspectRatio}</Badge>
            <Badge variant="outline">{generation.durationSecs}s</Badge>
            <Badge variant="outline">{generation.creditsCost} credits</Badge>
            <Badge variant="outline">{generation.isPublic ? "Public" : "Private"}</Badge>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {generation.videoUrl && (
              <a href={generation.videoUrl} download target="_blank" rel="noreferrer">
                <Button variant="outline" className="gap-2">
                  <Download className="size-4" /> Download
                </Button>
              </a>
            )}
            <Button onClick={handleRegenerate} disabled={createGeneration.isPending} className="gap-2">
              <RefreshCw className="size-4" />
              {createGeneration.isPending ? "Starting…" : "Regenerate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
