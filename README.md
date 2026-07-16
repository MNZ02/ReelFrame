# ReelFrame

**Prompt-to-video with cinematic camera language.**

ReelFrame is an open-source AI video generation app. Write a prompt, optionally attach a start image, pick a camera-motion preset (crash zoom, 360 orbit, bullet time, …), and generate a short clip. Browse public results on Explore, keep your own work in Library.

- **Repo:** [github.com/MNZ02/ReelFrame](https://github.com/MNZ02/ReelFrame)
- **Stack:** Next.js · Hono · Bun · Postgres · S3-compatible storage · fal.ai / Replicate

Contributions are welcome — presets, models, providers, UI, docs. See [Contributing](#contributing) and [`specs/06-contributing.md`](./specs/06-contributing.md).

---

## Features

| Area | What you get |
|------|----------------|
| **Create** | Prompt + optional start image, motion-preset grid, model / aspect / duration, live generation rail |
| **Camera presets** | ~20 cinematography-style moves (dolly, orbit, crane, whip pan, bullet time, …) |
| **Providers** | `mock` (offline), `fal` (Kling), `replicate` (Minimax Video-01) behind one interface |
| **Credits** | Signup grant (100), per-generation spend, automatic refund on failure / cancel |
| **Explore** | Public succeeded generations, prompt reuse |
| **Library** | Your history, status filter, public toggle, delete |
| **Auth** | Email/password (+ optional Google) via better-auth |
| **Characters** | Face-profile scaffolding (Phase 2 execution not shipped) |

---

## Monorepo layout

```
apps/
  web/                 # Next.js 15 frontend (App Router)
  api/                 # Hono API + pg-boss worker (Bun)
packages/
  db/                  # Drizzle schema + migrations
  shared/              # Zod contracts, presets, models, prompt builder
  eslint-config/
  typescript-config/
deploy/                # Caddy + production migration notes
specs/                 # Product & engineering docs
docker-compose.yml     # Local Postgres 17 + MinIO
docker-compose.prod.yml
```

Shared contracts live in `@repo/shared` so the API and web app stay type-aligned.

---

## Quick start (local)

**Requirements:** [Bun](https://bun.sh) (≥1.3 recommended), Docker, Node ≥18.

```bash
# 1. Infra
docker compose up -d

# 2. Install & migrate
bun install
cp .env.example .env   # mock provider works with no external keys
bun db:migrate

# 3. Dev (web :3000, API :4000, worker)
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up to receive **100** starter credits. With `VIDEO_PROVIDER=mock` (default), generations finish with a bundled sample MP4 — no API spend.

Optional:

```bash
bun db:seed          # demo@example.com / password + sample explore content
bun test             # API unit/integration tests (mock provider)
bun run smoke        # end-to-end smoke against a running stack
```

### Real video providers

| Env | Purpose |
|-----|---------|
| `VIDEO_PROVIDER=fal` + `FAL_KEY` | Kling models via fal.ai |
| `VIDEO_PROVIDER=replicate` + `REPLICATE_API_TOKEN` | Minimax Video-01 on Replicate |
| `S3_PUBLIC_ENDPOINT` | Public HTTPS base for MinIO (e.g. tunnel) — **required** for image-to-video with cloud providers |

See [`.env.example`](./.env.example) for the full list (auth, LLM prompt enhancer, Google OAuth).

---

## Scripts (root)

| Script | Description |
|--------|-------------|
| `bun dev` | Turbo: web + API/worker |
| `bun build` | Build all packages/apps |
| `bun lint` / `bun check-types` | Lint & typecheck |
| `bun test` | Run package tests |
| `bun db:migrate` / `bun db:generate` | Drizzle migrations |
| `bun db:seed` | Seed demo user & explore clips |
| `bun smoke` | API smoke script |

---

## Architecture (high level)

```
Browser (apps/web)
    │  same-origin /api/*  (Next rewrite → API)
    ▼
apps/api  (Hono)  ──►  Postgres (app data + pg-boss queue)
    │                        │
    │                        ▼
    │                   worker process
    │                        │
    ├── presigned PUT/GET ──► S3 / MinIO / R2
    └── submit/poll ────────► fal | Replicate | Mock
```

Details: [`specs/01-architecture.md`](./specs/01-architecture.md).

---

## Documentation

| Doc | Contents |
|-----|----------|
| [`specs/00-initial-video-app.md`](./specs/00-initial-video-app.md) | Original Phase 1 product spec (goals, milestones, acceptance) |
| [`specs/01-architecture.md`](./specs/01-architecture.md) | System design, processes, auth cookies, storage |
| [`specs/02-data-model.md`](./specs/02-data-model.md) | Postgres tables, enums, credit ledger rules |
| [`specs/03-api.md`](./specs/03-api.md) | HTTP API reference |
| [`specs/04-frontend.md`](./specs/04-frontend.md) | Routes, UI structure, data fetching |
| [`specs/05-generation-pipeline.md`](./specs/05-generation-pipeline.md) | Worker flow, providers, prompts, presets |
| [`specs/06-contributing.md`](./specs/06-contributing.md) | How to contribute, code map, good first tasks |
| [`deploy/MIGRATION.md`](./deploy/MIGRATION.md) | Production migration (Vercel + Neon + R2 / VM) |

---

## Contributing

We want this to be a great place for PRs — camera presets, new models/providers, UI polish, face-consistency (Phase 2), docs, and bug fixes.

1. Fork and branch from `main`.
2. Use `VIDEO_PROVIDER=mock` for free local iteration.
3. Prefer changes that keep `@repo/shared` as the single source of truth for contracts.
4. Run `bun lint`, `bun check-types`, and relevant tests before opening a PR.

More detail: **[`specs/06-contributing.md`](./specs/06-contributing.md)**.

---

## License

Check the repository for the license file. If none is present yet, open an issue before commercial reuse.
