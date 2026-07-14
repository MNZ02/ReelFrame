import { randomUUID } from "node:crypto";
import type {
  VideoProvider,
  VideoProviderPollResult,
  VideoProviderSubmitRequest,
} from "@repo/shared";

const SUBMIT_TO_READY_MS = 10_000;

const jobs = new Map<string, number>(); // providerJobId -> readyAtEpochMs

/**
 * Offline provider: "submits" instantly and reports the job as running for
 * ~10s, then succeeded with the bundled sample MP4. Enables full-stack dev
 * and E2E tests with zero external API spend.
 */
export class MockProvider implements VideoProvider {
  name = "mock";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for VideoProvider interface parity
  async submit(_req: VideoProviderSubmitRequest): Promise<{ providerJobId: string }> {
    const providerJobId = randomUUID();
    jobs.set(providerJobId, Date.now() + SUBMIT_TO_READY_MS);
    return { providerJobId };
  }

  async poll(providerJobId: string): Promise<VideoProviderPollResult> {
    const readyAt = jobs.get(providerJobId);
    if (readyAt === undefined) {
      return { status: "failed", error: "Unknown mock job id" };
    }
    if (Date.now() < readyAt) {
      return { status: "running" };
    }
    return {
      status: "succeeded",
      // Served by the API itself via a static route so the worker can
      // "download" it like it would a real provider URL.
      videoUrl: MOCK_SAMPLE_URL,
    };
  }
}

export const MOCK_SAMPLE_URL = "mock://sample.mp4";
