import "./load-root-env";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  S3_ENDPOINT: required("S3_ENDPOINT"),
  S3_ACCESS_KEY: required("S3_ACCESS_KEY"),
  S3_SECRET_KEY: required("S3_SECRET_KEY"),
  S3_BUCKET: process.env.S3_BUCKET ?? "media",
  S3_REGION: process.env.S3_REGION ?? "us-east-1",
  // Optional. A publicly reachable base URL for MinIO (e.g. a cloudflared
  // tunnel to S3_ENDPOINT) used ONLY to presign source-image URLs handed to
  // an external video provider — the provider's cloud servers can't reach
  // our localhost S3_ENDPOINT. Browser-facing presigns keep using S3_ENDPOINT.
  // Empty means image-to-video is disabled for cloud providers (see the
  // guard in create-generation.ts).
  S3_PUBLIC_ENDPOINT: process.env.S3_PUBLIC_ENDPOINT ?? "",
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  VIDEO_PROVIDER: (process.env.VIDEO_PROVIDER ?? "mock") as "mock" | "fal" | "replicate",
  FAL_KEY: process.env.FAL_KEY ?? "",
  // Only required when VIDEO_PROVIDER=replicate, so mock/fal setups never
  // need it. Checked here (module load = process startup) rather than lazily
  // like FAL_KEY, so a misconfigured replicate deployment fails immediately
  // instead of on the first generation.
  REPLICATE_API_TOKEN:
    (process.env.VIDEO_PROVIDER ?? "mock") === "replicate"
      ? required("REPLICATE_API_TOKEN")
      : (process.env.REPLICATE_API_TOKEN ?? ""),
  API_PORT: Number(process.env.API_PORT ?? 4000),
  WEB_URL: process.env.WEB_URL ?? "http://localhost:3000",
} as const;

export const SIGNUP_GRANT_CREDITS = 100;
