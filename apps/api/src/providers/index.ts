import type { VideoProvider } from "@repo/shared";
import { env } from "../env";
import { MockProvider } from "./mock";
import { FalProvider } from "./fal";

export { MockProvider, MOCK_SAMPLE_URL } from "./mock";
export { FalProvider } from "./fal";

export function selectProvider(providerName: string = env.VIDEO_PROVIDER): VideoProvider {
  if (providerName === "fal") {
    return new FalProvider(env.FAL_KEY);
  }
  return new MockProvider();
}
