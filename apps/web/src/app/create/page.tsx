"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DEFAULT_MODEL_SLUG, getCreditsCost, type MediaAssetResponse, type AspectRatio } from "@repo/shared";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PresetGrid } from "@/components/create/preset-grid";
import { ImageDropzone } from "@/components/create/image-dropzone";
import { CreditsModal } from "@/components/create/credits-modal";
import { GenerationRail } from "@/components/create/generation-rail";
import { usePresets, useModels } from "@/lib/hooks/use-catalog";
import { useCreateGeneration } from "@/lib/hooks/use-generations";
import { ApiRequestError } from "@/lib/api";

const DURATIONS = [5, 10] as const;

function CreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: presets = [] } = usePresets();
  const { data: models = [] } = useModels();
  const createGeneration = useCreateGeneration();

  const [prompt, setPrompt] = useState(searchParams.get("prompt") ?? "");
  const [preset, setPreset] = useState<string | null>(searchParams.get("preset"));
  const [model, setModel] = useState(searchParams.get("model") ?? DEFAULT_MODEL_SLUG);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [durationSecs, setDurationSecs] = useState<5 | 10>(5);
  const [sourceImage, setSourceImage] = useState<MediaAssetResponse | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  const selectedModel = models.find((m) => m.slug === model);

  useEffect(() => {
    if (selectedModel && !selectedModel.supportedAspectRatios.includes(aspectRatio)) {
      setAspectRatio(selectedModel.supportedAspectRatios[0] ?? "16:9");
    }
  }, [selectedModel, aspectRatio]);

  const creditsCost = useMemo(() => getCreditsCost(model, durationSecs) ?? 0, [model, durationSecs]);

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Write a prompt first");
      return;
    }
    try {
      const generation = await createGeneration.mutateAsync({
        prompt: prompt.trim(),
        motionPreset: preset,
        model,
        aspectRatio,
        durationSecs,
        sourceImageId: sourceImage?.id ?? null,
        isPublic,
      });
      toast.success("Generation started");
      router.push(`/generations/${generation.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "INSUFFICIENT_CREDITS") {
        setCreditsModalOpen(true);
        return;
      }
      toast.error(err instanceof Error ? err.message : "Could not start generation");
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A lone astronaut walking across a red desert at sunset…"
                rows={4}
              />
              <div className="flex flex-col gap-2">
                <Label>Start image (optional)</Label>
                <ImageDropzone value={sourceImage} onChange={setSourceImage} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Camera motion</CardTitle>
            </CardHeader>
            <CardContent>
              <PresetGrid presets={presets} selected={preset} onSelect={setPreset} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.slug} value={m.slug}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedModel && (
                  <p className="text-xs text-muted-foreground">{selectedModel.description}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Aspect ratio</Label>
                <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AspectRatio)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedModel?.supportedAspectRatios ?? ["16:9", "9:16", "1:1"]).map((ar) => (
                      <SelectItem key={ar} value={ar}>
                        {ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Duration</Label>
                <Select
                  value={String(durationSecs)}
                  onValueChange={(v) => setDurationSecs(Number(v) as 5 | 10)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} seconds
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                type="button"
                onClick={() => setIsPublic((p) => !p)}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>Share to Explore</span>
                <span
                  className={
                    isPublic
                      ? "rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                      : "rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                  }
                >
                  {isPublic ? "Public" : "Private"}
                </span>
              </button>

              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={createGeneration.isPending || !prompt.trim()}
                className="mt-2"
              >
                {createGeneration.isPending
                  ? "Starting…"
                  : `Generate · ${creditsCost} credit${creditsCost === 1 ? "" : "s"}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <GenerationRail />

      <CreditsModal open={creditsModalOpen} onOpenChange={setCreditsModalOpen} />
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateForm />
    </Suspense>
  );
}
