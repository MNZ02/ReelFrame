import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ReplicateProvider } from "../src/providers";

const REAL_FETCH = globalThis.fetch;

function mockFetchOnce(response: { status?: number; json?: unknown; text?: string }) {
  const status = response.status ?? 200;
  globalThis.fetch = (async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => response.json,
      text: async () => response.text ?? JSON.stringify(response.json ?? {}),
    }) as Response) as unknown as typeof fetch;
}

describe("ReplicateProvider (acceptance #2: mocked-fetch coverage of submit shape + poll mapping)", () => {
  afterEach(() => {
    globalThis.fetch = REAL_FETCH;
  });

  describe("submit", () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;

    beforeEach(() => {
      capturedUrl = undefined;
      capturedInit = undefined;
      globalThis.fetch = (async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        capturedInit = init;
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "abc123", status: "starting" }),
          text: async () => "",
        } as Response;
      }) as unknown as typeof fetch;
    });

    test("posts to the minimax/video-01 predictions endpoint with a bearer auth header", async () => {
      const provider = new ReplicateProvider("test-token");
      await provider.submit({
        prompt: "a cat riding a skateboard",
        aspectRatio: "16:9",
        durationSecs: 5,
        model: "minimax/video-01",
      });

      expect(capturedUrl).toBe(
        "https://api.replicate.com/v1/models/minimax/video-01/predictions",
      );
      const headers = capturedInit?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer test-token");
      const body = JSON.parse(capturedInit?.body as string);
      expect(body.input.prompt).toBe("a cat riding a skateboard");
      expect(body.input.first_frame_image).toBeUndefined();
    });

    test("includes first_frame_image when a source image URL is given", async () => {
      const provider = new ReplicateProvider("test-token");
      await provider.submit({
        prompt: "test",
        sourceImageUrl: "https://example.com/frame.png",
        aspectRatio: "16:9",
        durationSecs: 5,
        model: "minimax/video-01",
      });

      const body = JSON.parse(capturedInit?.body as string);
      expect(body.input.first_frame_image).toBe("https://example.com/frame.png");
    });

    test("returns the prediction id as providerJobId", async () => {
      const provider = new ReplicateProvider("test-token");
      const { providerJobId } = await provider.submit({
        prompt: "test",
        aspectRatio: "16:9",
        durationSecs: 5,
        model: "minimax/video-01",
      });
      expect(providerJobId).toBe("abc123");
    });
  });

  describe("poll", () => {
    test("maps starting -> pending", async () => {
      mockFetchOnce({ json: { status: "starting" } });
      const provider = new ReplicateProvider("test-token");
      const result = await provider.poll("abc123");
      expect(result.status).toBe("pending");
    });

    test("maps processing -> running", async () => {
      mockFetchOnce({ json: { status: "processing" } });
      const provider = new ReplicateProvider("test-token");
      const result = await provider.poll("abc123");
      expect(result.status).toBe("running");
    });

    test("maps succeeded with output as a plain string -> succeeded + videoUrl", async () => {
      mockFetchOnce({
        json: { status: "succeeded", output: "https://replicate.delivery/video.mp4" },
      });
      const provider = new ReplicateProvider("test-token");
      const result = await provider.poll("abc123");
      expect(result.status).toBe("succeeded");
      if (result.status === "succeeded") {
        expect(result.videoUrl).toBe("https://replicate.delivery/video.mp4");
      }
    });

    test("maps succeeded with output as a single-element array -> succeeded + videoUrl", async () => {
      mockFetchOnce({
        json: { status: "succeeded", output: ["https://replicate.delivery/video.mp4"] },
      });
      const provider = new ReplicateProvider("test-token");
      const result = await provider.poll("abc123");
      expect(result.status).toBe("succeeded");
      if (result.status === "succeeded") {
        expect(result.videoUrl).toBe("https://replicate.delivery/video.mp4");
      }
    });

    test("maps failed -> failed + error message", async () => {
      mockFetchOnce({
        json: { status: "failed", error: "NSFW content detected" },
      });
      const provider = new ReplicateProvider("test-token");
      const result = await provider.poll("abc123");
      expect(result.status).toBe("failed");
      if (result.status === "failed") {
        expect(result.error).toBe("NSFW content detected");
      }
    });

    test("maps canceled -> failed + error message", async () => {
      mockFetchOnce({
        json: { status: "canceled", error: null },
      });
      const provider = new ReplicateProvider("test-token");
      const result = await provider.poll("abc123");
      expect(result.status).toBe("failed");
      if (result.status === "failed") {
        expect(result.error).toMatch(/canceled/);
      }
    });
  });
});
