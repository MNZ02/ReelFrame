# Spec 00 — Initial Video App (Higgsfield Clone, Phase 1)

## Overview

A 1:1-as-possible clone of [Higgsfield](https://higgsfield.ai): an AI video
generation platform where users write a prompt (optionally with a start image),
pick a cinematic camera-motion preset, spend credits to generate a short video,
and browse results in a personal library and a public explore feed.

Phase 1 delivers the full product loop — auth → create → generate → watch →
browse — against a real external video model, with local infrastructure
(Postgres + MinIO) running in Docker. Face swapping is **not** implemented in
Phase 1, but its data model and provider abstraction are laid down so it slots
in later without schema or architecture changes.

## Goals

- End-to-end video generation: prompt (+ optional image) → job → playable MP4
  served from our own object store.
- Higgsfield's signature UX: a visual grid of camera-motion presets
  (crash zoom, dolly in, 360 orbit, bullet time, …) that modify the prompt.
- Credits system: generations cost credits; new users get a starter grant.
- Explore feed (public generations) and personal Library.
- Async job pipeline with live status updates in the UI.
- Foundations for face swap: DB tables, provider interface, storage layout.

## Non-goals (Phase 1)

- Face swap execution, character consistency ("Soul"/character features).
- Real payments (credits are granted, not purchased; billing UI is a stub).
- Self-hosted video model — we call an external API.
- Video editing, upscaling, lip sync, image generation.
- Production deployment, horizontal scaling, CDN.

## Architecture

Matches the whiteboard diagram: Frontend → Backend → {Postgres, MinIO,
Video model API, (later) face-swap model}.

```
┌──────────────┐  HTTP/JSON   ┌──────────────┐        ┌──────────────┐
│  apps/web    │─────────────▶│  apps/api    │───────▶│  Postgres    │
│  Next.js     │              │  Hono (Bun)  │        │  (Docker)    │
└──────────────┘              └──────┬───────┘        └──────────────┘
       ▲                             │ enqueue (pg-boss, in Postgres)
       │ presigned URLs              ▼
       │                      ┌──────────────┐        ┌──────────────┐
       └──────────────────────│ apps/api     │───────▶│ Video model  │
                              │ worker entry │  HTTPS │ API (fal.ai) │
                              └──────┬───────┘        └──────────────┘
                                     │ put/get               ┆
                              ┌──────▼───────┐        ┌──────────────┐
                              │  MinIO       │        │ Face swap    │
                              │  (Docker)    │        │ (Phase 2)    │
                              └──────────────┘        └──────────────┘
```

Key decisions:

| Concern         | Choice                          | Rationale |
|-----------------|---------------------------------|-----------|
| Frontend        | Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui | What Higgsfield itself uses; fastest path to a 1:1 UI |
| Backend         | Hono on Bun, separate from Next.js | Matches diagram; long-running jobs don't fit API routes |
| Job queue       | pg-boss (queue lives in Postgres) | No Redis to run; retries/backoff built in; swap for BullMQ later if needed |
| ORM             | Drizzle                         | TS-first, plain SQL underneath, first-class Bun support |
| Auth            | better-auth (email/password + Google) | TS-native, Drizzle adapter, session cookies shared with the API |
| Object store    | MinIO (S3 API) via `@aws-sdk/client-s3` | User requirement; S3-compatible so production is a config change |
| Video model     | fal.ai behind a `VideoProvider` interface | Cheap per-clip pricing, simple queue API; `MockProvider` for offline dev |
| Validation/types| Zod schemas in `packages/shared`, inferred types both sides | One source of truth for API contracts |

## Monorepo layout

Extends the existing turborepo + bun workspace:

```
apps/
  web/                  # Next.js frontend
  api/                  # Hono backend
    src/index.ts        #   API server entrypoint
    src/worker.ts       #   pg-boss worker entrypoint (separate process)
packages/
  db/                   # Drizzle schema, migrations, client
  shared/               # Zod schemas, API types, constants (motion presets, credit costs)
  eslint-config/        # (existing)
  typescript-config/    # (existing)
docker-compose.yml      # postgres:17, minio, minio bucket bootstrap
```

## Data model (Postgres, via Drizzle)

better-auth manages `user`, `session`, `account`, `verification` tables.
App tables:

```
credit_ledger
  id            uuid pk
  user_id       fk → user
  delta         int            -- +100 signup grant, -N per generation, +N refund
  reason        text           -- 'signup_grant' | 'generation' | 'refund' | 'admin_grant'
  generation_id uuid null fk
  created_at    timestamptz
  -- balance = SUM(delta); enforced non-negative in a serializable txn

media_assets                    -- every file we store in MinIO
  id            uuid pk
  user_id       fk → user
  kind          text           -- 'source_image' | 'video' | 'thumbnail' | 'face_source'
  bucket        text
  object_key    text           -- e.g. videos/{userId}/{generationId}.mp4
  mime_type     text
  size_bytes    bigint
  width/height  int null
  duration_ms   int null
  created_at    timestamptz

generations
  id              uuid pk
  user_id         fk → user
  status          text         -- 'queued' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  prompt          text
  enhanced_prompt text null    -- prompt after motion-preset template applied
  motion_preset   text null    -- slug from packages/shared preset catalog
  model           text         -- provider model slug, e.g. 'kling-video/v2/master'
  provider        text         -- 'fal' | 'mock'
  provider_job_id text null
  aspect_ratio    text         -- '16:9' | '9:16' | '1:1'
  duration_secs   int          -- 5 | 10
  credits_cost    int
  source_image_id uuid null fk → media_assets
  video_asset_id  uuid null fk → media_assets
  thumbnail_id    uuid null fk → media_assets
  is_public       bool default true   -- feeds /explore
  error_message   text null
  created/started/completed_at timestamptz

-- Face-swap foundations (schema only in Phase 1, no execution path)
face_profiles
  id / user_id / name / status ('pending'|'ready'|'failed') / created_at
face_profile_images
  id / face_profile_id fk / media_asset_id fk (kind='face_source')
-- generations gets: face_profile_id uuid null fk → face_profiles
```

## Object storage (MinIO)

- Buckets: `media` (private, everything user-generated), created by a
  bootstrap container in docker-compose.
- Key layout: `sources/{userId}/{uuid}.{ext}`, `videos/{userId}/{generationId}.mp4`,
  `thumbs/{userId}/{generationId}.jpg`, `faces/{userId}/{profileId}/{uuid}.jpg`.
- Browser never gets raw MinIO credentials:
  - **Upload**: API issues presigned PUT (validated content-type/size),
    client uploads directly, then confirms → `media_assets` row.
  - **Playback**: API responses include short-lived presigned GET URLs
    resolved at read time (never stored).

## Video provider abstraction

```ts
// packages/shared — implemented in apps/api/src/providers/
interface VideoProvider {
  name: string;
  submit(req: {
    prompt: string;
    sourceImageUrl?: string;      // presigned GET the provider can fetch
    aspectRatio: AspectRatio;
    durationSecs: number;
    model: string;
  }): Promise<{ providerJobId: string }>;
  poll(providerJobId: string): Promise<
    | { status: 'pending' | 'running' }
    | { status: 'succeeded'; videoUrl: string }
    | { status: 'failed'; error: string }>;
}
```

- `FalProvider`: fal.ai queue API (submit → poll → result URL).
- `MockProvider`: waits ~10s, returns a bundled sample MP4 — enables full-stack
  dev and E2E tests with zero API spend. Selected via `VIDEO_PROVIDER=mock`.
- `FaceSwapProvider` interface defined alongside with the same shape
  (submit/poll) and **no implementation** — Phase 2 fills it in.

## Generation pipeline (worker)

```
POST /generations
  └─ txn: check balance ≥ cost → insert generation(queued) → ledger(-cost)
     → pg-boss send('generation', {generationId})

worker 'generation' handler:
  1. status → processing
  2. build final prompt: preset template ∘ user prompt  (enhanced_prompt)
  3. provider.submit() with presigned source-image URL if present
  4. poll every 5s (job timeout 15 min)
  5. succeeded → stream video from provider URL → MinIO put
     → ffmpeg thumbnail (first frame) → MinIO put
     → media_assets rows → generation succeeded
  6. failed/timeout → generation failed + error_message
     → ledger(+cost, 'refund')
retries: pg-boss retryLimit 2 with backoff on transient errors;
         provider-reported generation failures are terminal (refund, no retry)
```

Frontend follows status by polling `GET /generations/:id` every 3s while
non-terminal (SSE is a possible later upgrade; polling ships first).

## API surface (Hono, `/api/v1`, session-cookie auth)

```
POST   /auth/*                       better-auth handler (mounted)
GET    /me                           profile + credit balance

POST   /uploads/presign              → {uploadUrl, objectKey}  (images only, ≤10 MB)
POST   /uploads/confirm              → media_asset

GET    /presets                      motion-preset catalog (from packages/shared)
GET    /models                       available video models + credit costs

POST   /generations                  create + enqueue  (zod-validated)
GET    /generations                  own history, cursor-paginated, ?status=
GET    /generations/:id              detail incl. presigned video/thumb URLs
POST   /generations/:id/cancel       only while queued (refund)
DELETE /generations/:id              soft-hide + delete objects
PATCH  /generations/:id              toggle is_public

GET    /explore                      public succeeded generations, paginated

POST   /face-profiles                Phase-1 stub: creates 'pending' profile
GET    /face-profiles                (lets UI ship; processing lands Phase 2)
```

Errors: consistent `{error: {code, message}}`; 402-style `INSUFFICIENT_CREDITS`
handled specially by the UI (opens credits modal).

## Frontend (apps/web)

Dark theme throughout, mirroring Higgsfield's look (near-black background,
card grids, chunky rounded previews). shadcn/ui + Tailwind v4.

Routes:

| Route              | Purpose |
|--------------------|---------|
| `/`                | Minimal landing: hero + preset showcase reel → sign up |
| `/login`, `/signup`| better-auth email/password + Google button |
| `/explore`         | Masonry grid of public videos; hover-to-play, click → detail modal with prompt/preset/model, "Use this prompt" |
| `/create`          | The core screen: prompt textarea, optional start-image upload (drag-drop), **motion-preset grid** (thumbnail cards w/ hover preview, single-select), model + aspect + duration selectors, credit cost on the Generate button; recent generations rail with live status |
| `/library`         | Own generations grid, status filter, delete / toggle-public |
| `/generations/[id]`| Player page: video, metadata, download, regenerate |
| `/credits`         | Balance + ledger history; "Buy" buttons are non-functional stubs |
| `/characters`      | Face-profile stub page: create profile + upload photos, "Coming soon" on swap actions |

State/data: TanStack Query for API calls (polling for in-flight generations);
zod-typed client in `packages/shared` consumed by both apps.

Motion presets: a curated catalog (~20 to start) in `packages/shared`
— `{slug, name, thumbnailUrl, promptTemplate}` e.g.
`crash-zoom: "Crash zoom in on {prompt}, fast aggressive push-in, motion blur"`.
Static preset thumbnails checked into `apps/web/public`.

## Local development

```
docker compose up -d      # postgres:17, minio + bucket bootstrap
bun install
bun db:migrate            # drizzle-kit
bun dev                   # turbo: web :3000, api :4000, worker
```

`.env` (root, `.env.example` committed): `DATABASE_URL`, `S3_*` (endpoint/keys/
bucket), `BETTER_AUTH_SECRET`, `VIDEO_PROVIDER` (`mock` default), `FAL_KEY`.

## Milestones

1. **Scaffold** — apps/web (create-next-app), apps/api (Hono), packages/db,
   packages/shared, docker-compose, turbo tasks wired, envs.
2. **Auth + credits** — better-auth both sides, signup grant (100 credits),
   `/me`, protected routes, login/signup pages.
3. **Storage** — MinIO client, presigned upload/confirm flow, `media_assets`.
4. **Generation pipeline** — generations table, pg-boss worker, `MockProvider`
   end-to-end: create → poll → playable video from MinIO.
5. **Create page UI** — preset grid, upload, selectors, live status rail.
6. **Library + Explore + player page.**
7. **FalProvider** — real model behind the same interface; thumbnails via ffmpeg.
8. **Face-swap foundations** — tables, `FaceSwapProvider` stub, `/characters` page.
9. **Polish** — landing page, credits page, empty/error states, seed script
   (demo user + sample public generations for /explore).

Each milestone leaves `bun dev` fully working.

## Acceptance criteria

- Fresh clone: `docker compose up -d && bun install && bun db:migrate && bun dev`
  works with no external keys (mock provider).
- New user signs up, gets 100 credits, generates a 5s video from prompt +
  preset, watches it stream from MinIO presigned URL; balance decreased.
- Failed generation refunds credits and shows the error in the UI.
- Second user sees the first user's public generation on /explore but cannot
  access their private assets or library.
- Insufficient credits blocks generation with the credits modal, not a 500.
- Switching `VIDEO_PROVIDER=fal` + `FAL_KEY` produces a real generated video
  with zero code changes.
- `turbo build`, `turbo lint`, `turbo check-types` pass at repo root.

## Phase 2 preview (out of scope, informs Phase 1 shapes)

Face swap lands as: implement `FaceSwapProvider` (self-hosted, e.g.
InsightFace/ROOP-family behind a small HTTP service), face-profile processing
worker (embedding extraction → status 'ready'), and a `face_profile_id` option
on the create form — all against tables and interfaces that already exist.
