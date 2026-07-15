export interface VideoModel {
  slug: string;
  name: string;
  description: string;
  creditsCostPerGeneration: Record<"5" | "10", number>;
  supportedAspectRatios: Array<"16:9" | "9:16" | "1:1">;
  supportsSourceImage: boolean;
}

export const VIDEO_MODELS: VideoModel[] = [
  {
    slug: "kling-video/v2/master",
    name: "Kling v2 Master",
    description: "High fidelity cinematic video generation, best overall quality.",
    creditsCostPerGeneration: { "5": 20, "10": 35 },
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsSourceImage: true,
  },
  {
    slug: "kling-video/v1.6/standard",
    name: "Kling v1.6 Standard",
    description: "Fast, lower-cost generation for quick iteration.",
    creditsCostPerGeneration: { "5": 10, "10": 18 },
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsSourceImage: true,
  },
  {
    slug: "minimax/video-01",
    name: "Minimax Video-01 (Replicate)",
    description:
      "Replicate free-run tier model, text- or image-to-video. Always renders " +
      "a fixed ~6s clip regardless of the requested duration or aspect ratio " +
      "(the model controls both) — ReplicateProvider clamps/ignores those " +
      "fields accordingly. Flat cost for either duration option since actual " +
      "output length doesn't vary.",
    creditsCostPerGeneration: { "5": 10, "10": 10 },
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsSourceImage: true,
  },
];

export const DEFAULT_MODEL_SLUG = "kling-video/v1.6/standard";

export function getModel(slug: string): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.slug === slug);
}

export function getCreditsCost(modelSlug: string, durationSecs: number): number | undefined {
  const model = getModel(modelSlug);
  if (!model) return undefined;
  if (durationSecs !== 5 && durationSecs !== 10) return undefined;
  return model.creditsCostPerGeneration[durationSecs === 10 ? "10" : "5"];
}
