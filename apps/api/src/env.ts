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
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  VIDEO_PROVIDER: (process.env.VIDEO_PROVIDER ?? "mock") as "mock" | "fal",
  FAL_KEY: process.env.FAL_KEY ?? "",
  API_PORT: Number(process.env.API_PORT ?? 4000),
  WEB_URL: process.env.WEB_URL ?? "http://localhost:3000",
} as const;

export const SIGNUP_GRANT_CREDITS = 100;
