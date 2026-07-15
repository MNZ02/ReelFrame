export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface VideoProviderSubmitRequest {
  prompt: string;
  negativePrompt?: string;
  sourceImageUrl?: string;
  aspectRatio: AspectRatio;
  durationSecs: number;
  model: string;
}

export interface VideoProviderSubmitResult {
  providerJobId: string;
}

export type VideoProviderPollResult =
  | { status: "pending" | "running" }
  | { status: "succeeded"; videoUrl: string }
  | { status: "failed"; error: string };

export interface VideoProvider {
  name: string;
  submit(req: VideoProviderSubmitRequest): Promise<VideoProviderSubmitResult>;
  poll(providerJobId: string): Promise<VideoProviderPollResult>;
}

/**
 * Phase 2 stub — same shape as VideoProvider, no implementation shipped in
 * Phase 1. Declared here so the frontend and worker can be written against
 * a stable interface ahead of time.
 */
export interface FaceSwapProviderSubmitRequest {
  sourceImageUrl: string;
  targetVideoUrl: string;
}

export interface FaceSwapProviderSubmitResult {
  providerJobId: string;
}

export type FaceSwapProviderPollResult =
  | { status: "pending" | "running" }
  | { status: "succeeded"; videoUrl: string }
  | { status: "failed"; error: string };

export interface FaceSwapProvider {
  name: string;
  submit(req: FaceSwapProviderSubmitRequest): Promise<FaceSwapProviderSubmitResult>;
  poll(providerJobId: string): Promise<FaceSwapProviderPollResult>;
}
