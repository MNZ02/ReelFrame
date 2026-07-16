# 05 — Generation pipeline, prompts & providers

End-to-end path from “Generate” click to playable MP4 in object storage.

---

## Sequence

```
Client                    API                         Worker                    Provider / S3
  │                        │                            │                            │
  │ POST /generations      │                            │                            │
  │───────────────────────►│ txn: lock, debit, insert   │                            │
  │                        │ pg-boss send               │                            │
  │◄──── 201 Generation ───│                            │                            │
  │                        │                            │◄── job ────────────────────│
  │ poll GET /:id          │                            │ status=processing          │
  │                        │                            │ normalize image (optional) │
  │                        │                            │ submit ───────────────────►│
  │                        │                            │ poll 5s ──────────────────►│
  │                        │                            │ download video ───────────►│ S3 put
  │                        │                            │ ffmpeg thumb ─────────────►│ S3 put
  │                        │                            │ status=succeeded           │
  │◄──── succeeded + urls ─│                            │                            │
```

On terminal failure (provider error, timeout): `status=failed`, `error_message` set, **credits refunded** via ledger.

On cancel while still `queued`: `canceled` + refund (no worker work, or worker no-ops if already terminal).

---

## Create path (API)

File: `apps/api/src/lib/create-generation.ts`

1. Validate model exists and is available for `env.VIDEO_PROVIDER`.
2. Resolve credit cost (`getCreditsCost`).
3. If `sourceImageId`, ensure asset ownership and kind; for non-mock providers, require `S3_PUBLIC_ENDPOINT` so the remote model can fetch the image.
4. Build enhanced + negative prompts (`buildEnhancedPrompt` + optional LLM enhancer).
5. In a transaction:
   - `lockUserForCredits`
   - ensure balance ≥ cost else `INSUFFICIENT_CREDITS`
   - insert `generations` (`queued`, freeze `provider` from env)
   - insert ledger `delta = -cost`, `reason = generation`
   - enqueue `generation` job with `{ generationId }`

---

## Worker path

File: `apps/api/src/pipeline.ts`  
Entry: `apps/api/src/worker.ts` (pg-boss handler)

Constants:

- Poll interval: **5s**
- Job timeout: **15 minutes**
- Safe for retries if generation is not already terminal

Steps:

1. Skip if generation missing or already terminal.
2. Set `processing` + `started_at`.
3. Resolve source image:
   - **mock:** presign original on internal endpoint.
   - **fal/replicate:** download original → `normalizeSourceImage` (EXIF orient, crop to aspect, downscale via sharp) → put normalized key → presign with **public** endpoint for provider fetch.
4. `provider.submit({ prompt: enhancedPrompt, negativePrompt, sourceImageUrl?, aspectRatio, durationSecs, model })`.
5. Terminal `ProviderError` → fail + refund (no retry). Transient errors rethrow for pg-boss retry.
6. Poll until succeeded/failed or timeout.
7. Success: stream/download remote video → put `videos/…` → ffmpeg first-frame JPEG → put `thumbs/…` → attach media asset IDs → `succeeded`.
8. Failure/timeout: `failed` + refund.

Mock success path can serve the bundled `apps/api/assets/sample.mp4` without a real network download.

---

## Prompt enhancement

### Rule-based (default)

`packages/shared/src/prompt.ts` → `buildEnhancedPrompt`:

```
{user subject}, {preset.motion if any}, {CINEMATIC_STYLE_SUFFIX}
```

Negative:

```
{DEFAULT_NEGATIVE_PROMPT}[, {user negative}]
```

Cinematic suffix and default negatives are tuned for fewer blurry/artifact-y clips; change carefully (affects all generations).

### LLM mode (optional)

Env: `PROMPT_ENHANCER=llm` plus `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (OpenAI-compatible chat, e.g. OpenRouter). On any LLM failure, falls back to rule-based. Implementation: `apps/api/src/lib/prompt-enhancer.ts`.

---

## Motion presets

Source of truth: `packages/shared/src/presets.ts` (`MOTION_PRESETS`).

Each preset:

| Field | Meaning |
|-------|---------|
| `slug` | Stable id stored on generation + thumbnail filename |
| `name` | UI label |
| `category` | Zoom & Push, Orbit, Aerial & Crane, Tracking, Reveal, Stylized, Static |
| `motion` | Natural-language camera clause composed into the prompt |
| `thumbnailUrl` | `/presets/{slug}.svg` served by the web app |

Adding a preset:

1. Append to `MOTION_PRESETS` with unique `slug`.
2. Add SVG (or image) at `apps/web/public/presets/{slug}.svg`.
3. No migration required — catalog is code, not DB.

---

## Provider interface

`packages/shared/src/providers.ts`:

```ts
interface VideoProvider {
  name: string;
  submit(req: VideoProviderSubmitRequest): Promise<{ providerJobId: string }>;
  poll(providerJobId: string): Promise<
    | { status: "pending" | "running" }
    | { status: "succeeded"; videoUrl: string }
    | { status: "failed"; error: string }
  >;
}
```

Implementations: `apps/api/src/providers/{mock,fal,replicate}.ts`  
Selection: `selectProvider()` in `providers/index.ts`.

`ProviderError` (`provider-error.ts`) carries `terminal` + `userMessage` so quota/auth/validation failures refund immediately without burning retries.

### Face swap (Phase 2)

`FaceSwapProvider` interface is declared with the same submit/poll shape. No implementation is wired into the worker yet. DB + `/face-profiles` + Characters UI are ready for it.

---

## Model catalog

`packages/shared/src/models.ts` — see credit table in [`02-data-model.md`](./02-data-model.md).

`getModelsForProvider(activeProvider)` filters the create form and `GET /models` so users cannot select a model the deployment cannot run.

---

## Frontend status UX

- After create, generation appears in rail/library as `queued` → `processing` → terminal.
- TanStack Query refetches on an interval while non-terminal.
- Failed jobs show `errorMessage`; credits should match `/me` after refund.
- Explore only surfaces `succeeded` + `isPublic`.

---

## Testing the pipeline

| Method | How |
|--------|-----|
| Unit / integration | `apps/api` → `bun test` with `VIDEO_PROVIDER=mock` |
| Smoke | `bun smoke` with stack running |
| Manual | Sign up → Create → mock finishes with sample MP4 |
| Real provider | Set key + provider env; for image-to-video set `S3_PUBLIC_ENDPOINT` to a tunnel |
