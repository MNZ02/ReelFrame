# 01 — Architecture

How ReelFrame is put together in practice (as implemented). For the original product goals and Phase 1 acceptance criteria, see [`00-initial-video-app.md`](./00-initial-video-app.md).

---

## Design goals

1. **Full product loop locally** with zero external API keys (`VIDEO_PROVIDER=mock`).
2. **Swap video backends** without UI or schema rewrites (`VideoProvider` interface).
3. **Own media** in S3-compatible storage; browsers never see long-lived object-store credentials.
4. **Credits as a ledger**, not a mutable balance column — spend/refund/audit trail.
5. **Shared contracts** in `@repo/shared` so web and API cannot drift on request/response shapes.

---

## Process topology

Three long-lived processes in development:

| Process | Package entry | Port / role |
|---------|---------------|-------------|
| **Web** | `apps/web` (Next.js) | `:3000` — UI + same-origin `/api/*` reverse rewrite |
| **API** | `apps/api/src/index.ts` | `:4000` — HTTP (Hono) + better-auth |
| **Worker** | `apps/api/src/worker.ts` | no port — pg-boss consumer for `generation` jobs |

`bun run dev` in `apps/api` runs API + worker together via `concurrently`. Root `bun dev` runs the turbo pipeline for web + api.

```
┌─────────────┐   rewrite /api/*    ┌─────────────┐
│  apps/web   │ ──────────────────► │  apps/api   │
│  Next.js    │   (first-party      │  Hono :4000 │
└─────────────┘    cookies)         └──────┬──────┘
                                           │
                    enqueue                │  LISTEN/NOTIFY
                    generation ────────────┤
                                           ▼
                                    ┌─────────────┐
                                    │   worker    │
                                    │  pipeline   │
                                    └──────┬──────┘
                       ┌───────────────────┼───────────────────┐
                       ▼                   ▼                   ▼
                 Postgres 17          S3 / MinIO         fal / Replicate
                 (app + pgboss)       (media bucket)     / Mock
```

---

## Monorepo packages

| Package | Responsibility |
|---------|----------------|
| `apps/web` | UI, TanStack Query, better-auth client, Next rewrites |
| `apps/api` | Routes, session middleware, S3, queue, providers, pipeline |
| `packages/db` | Drizzle schema (`auth` + `app`), migrations, client factory |
| `packages/shared` | Zod schemas, `MOTION_PRESETS`, `VIDEO_MODELS`, `buildEnhancedPrompt`, error codes, provider interfaces |
| `packages/eslint-config` / `typescript-config` | Shared tooling |

Workspaces are Bun workspaces (`apps/*`, `packages/*`) with Turbo for task orchestration.

---

## Auth & cookies

- **Server:** [better-auth](https://www.better-auth.com/) on the API at `/api/auth/*`, Drizzle adapter, email/password (+ optional Google when both OAuth env vars are set).
- **Client:** `better-auth` React client; session cookie sent with `credentials: "include"`.
- **Same-origin proxy:** The browser talks to **empty `API_URL`** (same origin). Next.js rewrites `/api/:path*` → `NEXT_PUBLIC_API_URL` (the real API). That keeps the session cookie first-party on the web host (`SameSite=Lax` works). Calling the API host directly from the browser breaks login on modern browsers when web and API are different sites.
- **Signup grant:** After user create, a ledger row `reason=signup_grant`, `delta=100` is inserted (idempotent unique index per user). Failure compensates by deleting the new user.

Trusted origin is `WEB_URL` (CORS + better-auth). Production uses HTTPS for both web and API so `Secure` cookies work.

---

## Data stores

### Postgres

- App tables + better-auth tables (see [`02-data-model.md`](./02-data-model.md)).
- **pg-boss** job queue lives in the same database (schema `pgboss`). The API and worker need a **session-mode** connection (not a transaction pooler that breaks `LISTEN/NOTIFY`). Neon: use the **direct** connection string.

### Object storage (S3 API)

- Local: MinIO via `docker-compose.yml` (ports `59000` API, `59001` console).
- Production path: R2 or MinIO behind Caddy HTTPS (see `deploy/`).
- Bucket: private `media`. Keys:

  | Kind | Key pattern |
  |------|-------------|
  | Source image | `sources/{userId}/{uuid}.{ext}` |
  | Normalized source (worker) | under generation-scoped keys |
  | Video | `videos/{userId}/{generationId}.mp4` |
  | Thumbnail | `thumbs/{userId}/{generationId}.jpg` |
  | Face source | `faces/{userId}/{profileId}/{uuid}.jpg` |

- **Upload:** API issues presigned PUT → browser uploads → `POST /uploads/confirm` creates `media_assets`.
- **Playback:** API responses include short-lived **presigned GET** URLs resolved at read time (never stored).
- **`S3_ENDPOINT`:** internal (API/worker → store).
- **`S3_PUBLIC_ENDPOINT`:** browser- and cloud-provider-reachable base for signing; required for image-to-video with fal/Replicate when MinIO is localhost (use a tunnel).

---

## Video providers

Selected by `VIDEO_PROVIDER` env (`mock` | `fal` | `replicate`). Model catalog entries declare which provider runs them; `GET /models` only returns models usable for the active provider (mock exposes all).

| Provider | Models (catalog) | Notes |
|----------|------------------|-------|
| `MockProvider` | any (stand-in) | ~10s delay, returns bundled sample MP4 |
| `FalProvider` | Kling v2 Master, Kling v1.6 Standard | Needs `FAL_KEY` |
| `ReplicateProvider` | minimax/video-01 | Needs `REPLICATE_API_TOKEN`; fixed ~6s clip regardless of UI duration |

Interface: `submit` → `poll` until succeeded/failed. See [`05-generation-pipeline.md`](./05-generation-pipeline.md).

---

## Job queue & pipeline

1. `POST /api/v1/generations` runs a transaction: advisory lock user → check balance → insert `generations` (`queued`) → ledger debit → `pg-boss.send('generation', { generationId })`.
2. Worker `processGeneration(id)`: mark `processing` → enhance path already stored → normalize source image if needed → `provider.submit` → poll every 5s (15 min timeout) → download video to S3 → ffmpeg thumbnail → `succeeded`, or `failed` + refund.
3. Transient errors may retry (pg-boss); terminal `ProviderError` fails immediately with refund.
4. UI polls `GET /generations/:id` every few seconds while status is non-terminal.

---

## Frontend architecture

- **Next.js App Router**, React 19, Tailwind v4, shadcn-style UI primitives.
- **TanStack Query** for server state; generation hooks poll while in flight.
- **Zod types** from `@repo/shared` for compile-time alignment (runtime validation lives on the API).
- Protected pages use a client `RequireAuth` gate after session fetch.

Route map: [`04-frontend.md`](./04-frontend.md).

---

## Production shapes

Two documented deployments:

1. **Single VM** (`docker-compose.prod.yml` + Caddy): Postgres, MinIO, API, worker on one host; web can still be separate.
2. **Split** (`deploy/MIGRATION.md`): web → Vercel, Postgres → Neon (direct URL), media → R2, API+worker stay on a VM behind Caddy/sslip.io HTTPS.

Auth always needs a clear story for cookie origin (same-origin rewrite on web is the preferred pattern).

---

## Observability & health

- `GET /health` → `{ ok: true }` on the API (no auth).
- Worker and API log unhandled errors to stdout.
- No distributed tracing shipped in Phase 1.

---

## Explicit non-goals (current phase)

- Real payments / credit purchases (UI stubs only).
- Self-hosted video diffusion models.
- Face-swap **execution** (schema + stub routes only).
- SSE/WebSocket status (polling only).
- CDN fronting media (presigned URLs from the store).
