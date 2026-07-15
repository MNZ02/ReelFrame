export interface VideoModel {
  slug: string;
  name: string;
  description: string;
  /**
   * The video provider that actually runs this model. A model is only usable
   * when the deployment's active VIDEO_PROVIDER matches this (or is "mock",
   * which stands in for any model during offline dev).
   */
  provider: "fal" | "replicate";
  creditsCostPerGeneration: Record<"5" | "10", number>;
  supportedAspectRatios: Array<"16:9" | "9:16" | "1:1">;
  supportsSourceImage: boolean;
}

export const VIDEO_MODELS: VideoModel[] = [
  {
    slug: "kling-video/v2/master",
    name: "Kling v2 Master",
    description: "High fidelity cinematic video generation, best overall quality.",
    provider: "fal",
    creditsCostPerGeneration: { "5": 20, "10": 35 },
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsSourceImage: true,
  },
  {
    slug: "kling-video/v1.6/standard",
    name: "Kling v1.6 Standard",
    description: "Fast, lower-cost generation for quick iteration.",
    provider: "fal",
    creditsCostPerGeneration: { "5": 10, "10": 18 },
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsSourceImage: true,
  },
  {
    slug: "minimax/video-01",
    name: "Minimax Video-01 (Replicate)",
    description:
      "Replicate free-run tier model, text- or image-to-video. Cheapest option " +
      "for testing. Always renders a fixed ~6s clip regardless of the requested " +
      "duration or aspect ratio (the model controls both) — ReplicateProvider " +
      "ignores those fields accordingly. Flat cost for either duration option " +
      "since actual output length doesn't vary.",
    provider: "replicate",
    creditsCostPerGeneration: { "5": 10, "10": 10 },
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsSourceImage: true,
  },
];

export const DEFAULT_MODEL_SLUG = "kling-video/v1.6/standard";

export function getModel(slug: string): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.slug === slug);
}

/**
 * The models a deployment can actually run, given its active video provider.
 * "mock" returns every model (the mock provider stands in for any of them
 * during offline dev); a real provider returns only the models it runs, so
 * the create form never offers a model that would fail at generation time.
 */
export function getModelsForProvider(activeProvider: string): VideoModel[] {
  if (activeProvider === "mock") return VIDEO_MODELS;
  return VIDEO_MODELS.filter((m) => m.provider === activeProvider);
}

/** Whether a model can run under the active provider ("mock" allows any). */
export function isModelAvailableForProvider(slug: string, activeProvider: string): boolean {
  const model = getModel(slug);
  if (!model) return false;
  return activeProvider === "mock" || model.provider === activeProvider;
}

export function getCreditsCost(modelSlug: string, durationSecs: number): number | undefined {
  const model = getModel(modelSlug);
  if (!model) return undefined;
  if (durationSecs !== 5 && durationSecs !== 10) return undefined;
  return model.creditsCostPerGeneration[durationSecs === 10 ? "10" : "5"];
}
