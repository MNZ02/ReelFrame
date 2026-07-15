import { afterEach, describe, expect, test } from "bun:test";
import {
  classifyProviderHttpError,
  parseRetryAfterSeconds,
  ProviderError,
} from "../src/providers/provider-error";
import { ReplicateProvider } from "../src/providers/replicate";

describe("classifyProviderHttpError", () => {
  test("402 quota is terminal", () => {
    const e = classifyProviderHttpError("Replicate", 402, '{"detail":"free time limit"}');
    expect(e).toBeInstanceOf(ProviderError);
    expect(e.terminal).toBe(true);
    expect(e.userMessage).toContain("free usage limit");
  });

  test("401/403 auth is terminal", () => {
    expect(classifyProviderHttpError("fal", 401, "").terminal).toBe(true);
    expect(classifyProviderHttpError("fal", 403, "").terminal).toBe(true);
  });

  test("400/422 invalid request is terminal", () => {
    expect(classifyProviderHttpError("Replicate", 422, "").terminal).toBe(true);
  });

  test("429 rate limit is transient", () => {
    expect(classifyProviderHttpError("Replicate", 429, "").terminal).toBe(false);
  });

  test("5xx is transient", () => {
    expect(classifyProviderHttpError("Replicate", 503, "").terminal).toBe(false);
  });
});

describe("parseRetryAfterSeconds", () => {
  test("reads the Retry-After header", () => {
    expect(parseRetryAfterSeconds(new Headers({ "retry-after": "7" }), "")).toBe(7);
  });
  test("falls back to a retry_after body field", () => {
    expect(parseRetryAfterSeconds(new Headers(), '{"retry_after":4}')).toBe(4);
  });
  test("undefined when neither present", () => {
    expect(parseRetryAfterSeconds(new Headers(), "not json")).toBeUndefined();
  });
});

describe("ReplicateProvider.submit error handling", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("402 throws a terminal ProviderError (no retry)", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response('{"detail":"free time limit"}', { status: 402 });
    }) as unknown as typeof fetch;

    const provider = new ReplicateProvider("test-token");
    await expect(
      provider.submit({ prompt: "x", aspectRatio: "16:9", durationSecs: 5, model: "minimax/video-01" }),
    ).rejects.toMatchObject({ terminal: true });
    expect(calls).toBe(1); // failed fast, did not retry
  });

  test("retries on 429 then succeeds", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) {
        return new Response('{"retry_after":0}', { status: 429 });
      }
      return new Response('{"id":"pred_123"}', { status: 201 });
    }) as unknown as typeof fetch;

    const provider = new ReplicateProvider("test-token");
    const res = await provider.submit({
      prompt: "x",
      aspectRatio: "16:9",
      durationSecs: 5,
      model: "minimax/video-01",
    });
    expect(res.providerJobId).toBe("pred_123");
    expect(calls).toBe(2);
  });
});
