import type {
  VideoProvider,
  VideoProviderPollResult,
  VideoProviderSubmitRequest,
} from "@repo/shared";
import { classifyProviderHttpError, parseRetryAfterSeconds, ProviderError } from "./provider-error";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const MODEL_PATH = "minimax/video-01";
const SUBMIT_MAX_ATTEMPTS = 4;
const MAX_RETRY_WAIT_MS = 30_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Replicate predictions API (submit -> poll), documented at
 * https://replicate.com/docs/topics/predictions. Selected via
 * VIDEO_PROVIDER=replicate, targeting minimax/video-01 on Replicate's
 * free-run tier. Never constructed/called when VIDEO_PROVIDER=mock/fal, so a
 * missing REPLICATE_API_TOKEN can't crash those modes (env.ts already fails
 * fast at startup when VIDEO_PROVIDER=replicate and the token is unset; this
 * check is a second line of defense for direct construction, mirroring
 * FalProvider).
 *
 * minimax/video-01 always renders a fixed ~6s clip and picks its own aspect
 * ratio — req.durationSecs and req.aspectRatio are accepted (for interface
 * parity with the other providers) but have no effect on the request sent
 * to Replicate; the actual output length/framing is whatever the model
 * produces.
 */
export class ReplicateProvider implements VideoProvider {
  name = "replicate";

  constructor(private readonly apiToken: string) {}

  private headers() {
    if (!this.apiToken) {
      throw new Error("REPLICATE_API_TOKEN is not set; cannot call the Replicate API");
    }
    return {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  async submit(req: VideoProviderSubmitRequest): Promise<{ providerJobId: string }> {
    const input: Record<string, unknown> = {
      prompt: req.prompt,
    };
    if (req.sourceImageUrl) {
      input.first_frame_image = req.sourceImageUrl;
    }
    const body = JSON.stringify({ input });

    // Retry only on rate limits (429), respecting Retry-After — Replicate's
    // free tier is capped at 6 req/min, burst 1. Any other error is classified
    // (402 quota / 401 auth / 4xx) and thrown as a ProviderError so the
    // pipeline can fail fast with a clean message instead of retrying.
    for (let attempt = 1; attempt <= SUBMIT_MAX_ATTEMPTS; attempt++) {
      const res = await fetch(`${REPLICATE_API_BASE}/models/${MODEL_PATH}/predictions`, {
        method: "POST",
        headers: this.headers(),
        body,
      });
      if (res.ok) {
        const parsed = (await res.json()) as { id: string };
        return { providerJobId: parsed.id };
      }

      const text = await res.text();
      if (res.status === 429 && attempt < SUBMIT_MAX_ATTEMPTS) {
        const waitMs = Math.min((parseRetryAfterSeconds(res.headers, text) ?? 5) * 1000 + 500, MAX_RETRY_WAIT_MS);
        console.warn(`[replicate] rate-limited (attempt ${attempt}/${SUBMIT_MAX_ATTEMPTS}), waiting ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }
      throw classifyProviderHttpError("Replicate", res.status, text);
    }
    throw new ProviderError("Replicate is rate-limiting requests; please try again shortly.", {
      terminal: false,
      status: 429,
    });
  }

  async poll(providerJobId: string): Promise<VideoProviderPollResult> {
    const res = await fetch(`${REPLICATE_API_BASE}/predictions/${providerJobId}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`Replicate status check failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as {
      status: string;
      output?: string | string[] | null;
      error?: string | null;
    };

    switch (body.status) {
      case "starting":
        return { status: "pending" };
      case "processing":
        return { status: "running" };
      case "succeeded": {
        const videoUrl = Array.isArray(body.output) ? body.output[0] : body.output;
        if (!videoUrl) {
          return { status: "failed", error: "Replicate result missing output video URL" };
        }
        return { status: "succeeded", videoUrl };
      }
      case "failed":
      case "canceled":
        return {
          status: "failed",
          error: body.error ?? `Replicate prediction ${body.status}`,
        };
      default:
        return { status: "failed", error: `Unexpected Replicate status: ${body.status}` };
    }
  }
}
