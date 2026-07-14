"use client";

import { useRouter } from "next/navigation";
import type { GenerationResponse } from "@repo/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ExploreDetailDialog({
  generation,
  onOpenChange,
}: {
  generation: GenerationResponse | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  function useThisPrompt() {
    if (!generation) return;
    const params = new URLSearchParams({ prompt: generation.prompt });
    if (generation.motionPreset) params.set("preset", generation.motionPreset);
    params.set("model", generation.model);
    router.push(`/create?${params.toString()}`);
  }

  return (
    <Dialog open={Boolean(generation)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {generation && (
          <>
            <DialogHeader>
              <DialogTitle>Generation detail</DialogTitle>
            </DialogHeader>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              {generation.videoUrl && (
                <video
                  src={generation.videoUrl}
                  poster={generation.thumbnailUrl ?? undefined}
                  controls
                  autoPlay
                  loop
                  className="size-full object-contain"
                />
              )}
            </div>
            <p className="text-sm text-foreground">{generation.prompt}</p>
            <div className="flex flex-wrap gap-2">
              {generation.motionPreset && <Badge variant="secondary">{generation.motionPreset}</Badge>}
              <Badge variant="outline">{generation.model}</Badge>
              <Badge variant="outline">{generation.aspectRatio}</Badge>
              <Badge variant="outline">{generation.durationSecs}s</Badge>
            </div>
            <Button onClick={useThisPrompt} className="mt-2">
              Use this prompt
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
