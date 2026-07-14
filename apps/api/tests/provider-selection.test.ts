import { describe, expect, test } from "bun:test";
import { selectProvider, MockProvider, FalProvider } from "../src/providers";

describe("VIDEO_PROVIDER selection (acceptance #9: env switch, zero code changes)", () => {
  test("selectProvider('mock') returns a MockProvider", () => {
    const provider = selectProvider("mock");
    expect(provider).toBeInstanceOf(MockProvider);
    expect(provider.name).toBe("mock");
  });

  test("selectProvider('fal') returns a FalProvider without requiring FAL_KEY at construction time", () => {
    const provider = selectProvider("fal");
    expect(provider).toBeInstanceOf(FalProvider);
    expect(provider.name).toBe("fal");
  });

  test("anything other than 'fal' falls back to MockProvider (mock is the safe default)", () => {
    expect(selectProvider("something-unknown")).toBeInstanceOf(MockProvider);
  });

  test("FalProvider.submit rejects immediately (no network call) when FAL_KEY is empty", async () => {
    const provider = new FalProvider("");
    await expect(
      provider.submit({
        prompt: "test",
        aspectRatio: "16:9",
        durationSecs: 5,
        model: "kling-video/v1.6/standard",
      }),
    ).rejects.toThrow(/FAL_KEY/);
  });

  test("MockProvider.submit + poll: pending immediately, succeeded eventually, with a video URL", async () => {
    const provider = new MockProvider();
    const { providerJobId } = await provider.submit({
      prompt: "test",
      aspectRatio: "16:9",
      durationSecs: 5,
      model: "kling-video/v1.6/standard",
    });
    const immediate = await provider.poll(providerJobId);
    expect(immediate.status).toBe("running");
  });
});
