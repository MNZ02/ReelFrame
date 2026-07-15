import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

/**
 * The client for direct, server-side object operations (put/get/delete). Uses
 * S3_ENDPOINT, which in a containerized deploy is the INTERNAL address (e.g.
 * http://minio:9000) — the API/worker talk to the store directly and must not
 * depend on the object store being reachable via the public IP (Docker hairpin
 * NAT to the host's own public address frequently fails).
 */
export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

/**
 * A second client whose presigned URLs are signed against the PUBLIC endpoint
 * (S3_PUBLIC_ENDPOINT — a real public host/IP in prod, a cloudflared tunnel in
 * local image-to-video). Only constructed when set. Presigning is
 * host-sensitive — the SigV4 signature covers the Host header — so a presigned
 * URL must be signed for the exact host the client (browser or provider) will
 * request; it cannot be string-swapped after signing.
 */
const s3Public = env.S3_PUBLIC_ENDPOINT
  ? new S3Client({
      endpoint: env.S3_PUBLIC_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
    })
  : null;

/**
 * Client for signing URLs a BROWSER will fetch (uploads, playback, thumbnails).
 * Prefers the public endpoint so the signed host is reachable off-box; falls
 * back to the internal client for local dev, where they are the same host.
 */
const s3ForBrowser = s3Public ?? s3;

export const BUCKET = env.S3_BUCKET;

export const hasPublicEndpoint = s3Public !== null;

export async function presignPutUrl(objectKey: string, contentType: string, expiresInSeconds = 300): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(s3ForBrowser, command, { expiresIn: expiresInSeconds });
}

export async function presignGetUrl(objectKey: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
  });
  return getSignedUrl(s3ForBrowser, command, { expiresIn: expiresInSeconds });
}

/**
 * Presign a GET URL an external video provider can fetch. Signed against the
 * public endpoint (tunnel) so the URL's host is reachable from the provider's
 * cloud, not our localhost. Throws if no public endpoint is configured — the
 * caller (worker) must never hand a localhost URL to a cloud provider.
 */
export async function presignGetUrlForProvider(objectKey: string, expiresInSeconds = 900): Promise<string> {
  if (!s3Public) {
    throw new Error(
      "S3_PUBLIC_ENDPOINT is not set; cannot presign a provider-reachable URL for this object",
    );
  }
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
  });
  return getSignedUrl(s3Public, command, { expiresIn: expiresInSeconds });
}

export async function getObjectBuffer(objectKey: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: objectKey }));
  if (!res.Body) {
    throw new Error(`Object ${objectKey} has no body`);
  }
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function putObject(objectKey: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(objectKey: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
    }),
  );
}
