/**
 * End-to-end smoke test against a running stack (docker compose + api +
 * worker, VIDEO_PROVIDER=mock): fresh signup -> create generation -> poll
 * until succeeded -> presigned video URL returns 200 -> ledger balance
 * reflects the spend. Exits non-zero on any failure.
 */
import { DEFAULT_MODEL_SLUG, getCreditsCost } from "@repo/shared";

const API_PORT = process.env.API_PORT ?? "4000";
const BASE_URL = `http://localhost:${API_PORT}`;

class SmokeError extends Error {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new SmokeError(message);
}

/** Asserts res.ok, reading the body as text for the error message ONLY on
 * failure — a template literal would eagerly consume the body either way. */
async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => "<unreadable body>");
    throw new SmokeError(`${label}: ${res.status} ${text}`);
  }
}

async function main() {
  const email = `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "smoke-test-password-123";

  console.log(`[smoke] signing up ${email}`);
  const signupRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Test", email, password }),
  });
  await assertOk(signupRes, "signup failed");

  const setCookies = signupRes.headers.getSetCookie?.() ?? [];
  assert(setCookies.length > 0, "signup did not set a session cookie");
  const cookieHeader = setCookies.map((c) => c.split(";")[0]).join("; ");

  function authedFetch(path: string, init: RequestInit = {}) {
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...init.headers, Cookie: cookieHeader },
    });
  }

  const meRes = await authedFetch("/api/v1/me");
  assert(meRes.ok, `GET /me failed: ${meRes.status}`);
  const me = (await meRes.json()) as { credits: number };
  console.log(`[smoke] signup granted ${me.credits} credits`);
  assert(me.credits === 100, `expected exactly 100 signup credits, got ${me.credits}`);

  const durationSecs = 5;
  const cost = getCreditsCost(DEFAULT_MODEL_SLUG, durationSecs);
  assert(cost !== undefined, `no credit cost configured for ${DEFAULT_MODEL_SLUG}/${durationSecs}s`);

  console.log("[smoke] creating generation");
  const createRes = await authedFetch("/api/v1/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "A cat riding a skateboard through a neon city",
      model: DEFAULT_MODEL_SLUG,
      aspectRatio: "16:9",
      durationSecs,
    }),
  });
  await assertOk(createRes, "create generation failed");
  const created = (await createRes.json()) as { id: string; status: string };
  console.log(`[smoke] generation ${created.id} queued`);

  interface GenerationPollResult {
    id: string;
    status: string;
    videoUrl: string | null;
    errorMessage: string | null;
  }

  const deadline = Date.now() + 60_000;
  let final: GenerationPollResult | null = null;
  while (Date.now() < deadline) {
    const res = await authedFetch(`/api/v1/generations/${created.id}`);
    assert(res.ok, `poll generation failed: ${res.status}`);
    const body = (await res.json()) as GenerationPollResult;
    if (body.status === "succeeded" || body.status === "failed" || body.status === "canceled") {
      final = body;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  if (final === null) {
    throw new SmokeError("generation did not reach a terminal state within 60s");
  }
  if (final.status !== "succeeded") {
    throw new SmokeError(`generation ended in status=${final.status}, error=${final.errorMessage}`);
  }
  const videoUrl = final.videoUrl;
  if (!videoUrl) {
    throw new SmokeError("succeeded generation has no videoUrl");
  }
  console.log(`[smoke] generation succeeded, video at ${videoUrl}`);

  const videoRes = await fetch(videoUrl);
  assert(videoRes.ok, `presigned video URL did not return 200: ${videoRes.status}`);
  console.log("[smoke] presigned video URL returned 200");

  const meAfterRes = await authedFetch("/api/v1/me");
  assert(meAfterRes.ok, `GET /me (after) failed: ${meAfterRes.status}`);
  const meAfter = (await meAfterRes.json()) as { credits: number };
  const expected = 100 - cost;
  console.log(`[smoke] balance after generation: ${meAfter.credits} (expected ${expected})`);
  assert(meAfter.credits === expected, `expected balance ${expected}, got ${meAfter.credits}`);

  console.log("[smoke] all checks passed");
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
