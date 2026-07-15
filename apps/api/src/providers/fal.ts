import type {
  VideoProvider,
  VideoProviderPollResult,
  VideoProviderSubmitRequest,
} from "@repo/shared";
import { classifyProviderHttpError } from "./provider-error";

const FAL_QUEUE_BASE = "https://queue.fal.run";
const JOB_ID_SEP = "|||";

/**
 * fal.ai queue API (submit -> poll -> result), documented at
 * https://docs.fal.ai/model-apis/queue. Selected via VIDEO_PROVIDER=fal.
 * Never constructed/called when VIDEO_PROVIDER=mock, so a missing FAL_KEY
 * can't crash mock-mode runs.
 */
export class FalProvider implements VideoProvider {
  name = "fal";

  constructor(private readonly apiKey: string) {}

  private headers() {
    if (!this.apiKey) {
      throw new Error("FAL_KEY is not set; cannot call the fal.ai API");
    }
    return {
      Authorization: `Key ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async submit(req: VideoProviderSubmitRequest): Promise<{ providerJobId: string }> {
    const input: Record<string, unknown> = {
      prompt: req.prompt,
      aspect_ratio: req.aspectRatio,
      duration: req.durationSecs,
    };
    if (req.negativePrompt) {
      input.negative_prompt = req.negativePrompt;
    }
    if (req.sourceImageUrl) {
      input.image_url = req.sourceImageUrl;
    }

    const res = await fetch(`${FAL_QUEUE_BASE}/${req.model}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw classifyProviderHttpError("fal", res.status, await res.text());
    }
    const body = (await res.json()) as { request_id: string };
    return { providerJobId: `${req.model}${JOB_ID_SEP}${body.request_id}` };
  }

  async poll(providerJobId: string): Promise<VideoProviderPollResult> {
    const [model, requestId] = providerJobId.split(JOB_ID_SEP);
    if (!model || !requestId) {
      return { status: "failed", error: `Malformed fal job id: ${providerJobId}` };
    }

    const statusRes = await fetch(
      `${FAL_QUEUE_BASE}/${model}/requests/${requestId}/status`,
      { headers: this.headers() },
    );
    if (!statusRes.ok) {
      throw new Error(`fal status check failed: ${statusRes.status} ${await statusRes.text()}`);
    }
    const status = (await statusRes.json()) as { status: string };

    if (status.status === "IN_QUEUE" || status.status === "IN_PROGRESS") {
      return { status: status.status === "IN_QUEUE" ? "pending" : "running" };
    }
    if (status.status !== "COMPLETED") {
      return { status: "failed", error: `Unexpected fal status: ${status.status}` };
    }

    const resultRes = await fetch(`${FAL_QUEUE_BASE}/${model}/requests/${requestId}`, {
      headers: this.headers(),
    });
    if (!resultRes.ok) {
      return { status: "failed", error: `fal result fetch failed: ${resultRes.status}` };
    }
    const result = (await resultRes.json()) as { video?: { url?: string } };
    if (!result.video?.url) {
      return { status: "failed", error: "fal result missing video URL" };
    }
    return { status: "succeeded", videoUrl: result.video.url };
  }
}
