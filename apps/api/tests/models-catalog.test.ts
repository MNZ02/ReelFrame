import { describe, expect, test } from "bun:test";
import {
  getModelsForProvider,
  isModelAvailableForProvider,
  VIDEO_MODELS,
} from "@repo/shared";

describe("model catalog provider filtering", () => {
  test("mock returns every model (stands in for any provider)", () => {
    const models = getModelsForProvider("mock");
    expect(models.length).toBe(VIDEO_MODELS.length);
  });

  test("replicate returns only the replicate model(s)", () => {
    const models = getModelsForProvider("replicate");
    expect(models.map((m) => m.slug)).toEqual(["minimax/video-01"]);
    expect(models.every((m) => m.provider === "replicate")).toBe(true);
  });

  test("fal returns only the fal (Kling) models, never the replicate one", () => {
    const models = getModelsForProvider("fal");
    expect(models.every((m) => m.provider === "fal")).toBe(true);
    expect(models.some((m) => m.slug === "minimax/video-01")).toBe(false);
    expect(models.some((m) => m.slug.startsWith("kling-video/"))).toBe(true);
  });
});

describe("isModelAvailableForProvider", () => {
  test("rejects a fal model under the replicate provider", () => {
    expect(isModelAvailableForProvider("kling-video/v2/master", "replicate")).toBe(false);
  });

  test("accepts the replicate model under the replicate provider", () => {
    expect(isModelAvailableForProvider("minimax/video-01", "replicate")).toBe(true);
  });

  test("mock accepts any known model", () => {
    expect(isModelAvailableForProvider("kling-video/v2/master", "mock")).toBe(true);
    expect(isModelAvailableForProvider("minimax/video-01", "mock")).toBe(true);
  });

  test("rejects an unknown model regardless of provider", () => {
    expect(isModelAvailableForProvider("not-a-real-model", "mock")).toBe(false);
  });
});
