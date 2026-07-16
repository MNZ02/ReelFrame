# 06 — Contributing

Thanks for helping build **ReelFrame**. This doc is the practical map for open-source contributors.

Repo: [https://github.com/MNZ02/ReelFrame](https://github.com/MNZ02/ReelFrame)

---

## Before you start

1. Read the [README](../README.md) quick start and get `bun dev` running with **mock** provider.
2. Skim [`01-architecture.md`](./01-architecture.md) so process boundaries are clear.
3. Prefer small, reviewable PRs over mega-patches.

No external API keys are required for core contribution work.

---

## Dev environment

```bash
docker compose up -d
bun install
cp .env.example .env   # VIDEO_PROVIDER=mock
bun db:migrate
bun dev                # web :3000, api+worker :4000
```

Useful extras:

```bash
bun db:seed            # demo@example.com / password
bun test               # from root or apps/api
bun run check-types
bun run lint
bun smoke              # needs running API
```

---

## Project map (where to change things)

| You want to… | Start here |
|--------------|------------|
| Add a camera preset | `packages/shared/src/presets.ts` + `apps/web/public/presets/{slug}.svg` |
| Add / price a model | `packages/shared/src/models.ts` + provider impl if new backend |
| Change API request/response shapes | `packages/shared/src/schemas.ts` then routes |
| New HTTP route | `apps/api/src/routes/*` + mount in `app.ts` |
| Generation / refund logic | `create-generation.ts`, `pipeline.ts`, `credits.ts` |
| New video backend | implement `VideoProvider` in `apps/api/src/providers/` |
| Prompt quality | `packages/shared/src/prompt.ts` (+ optional LLM enhancer) |
| UI page or create flow | `apps/web/src/app/*`, `src/components/*` |
| DB table | `packages/db/src/schema/*` → `bun db:generate` → review migration |
| Auth / signup credits | `apps/api/src/auth.ts`, `SIGNUP_GRANT_CREDITS` in `env.ts` |

**Rule of thumb:** if web and API both need a constant or type, it belongs in `@repo/shared`.

---

## Good first contributions

- New motion presets (copy an existing SVG style; write a clear cinematography clause).
- Empty / error / loading state polish on Explore, Library, Create.
- Accessibility (labels, focus rings, keyboard on dialogs).
- Docs fixes and diagrams.
- Tests around validation, credits, or provider error mapping.
- Seed content quality for Explore.

## Medium / larger ideas

- Additional fal/Replicate (or other) models behind the provider interface.
- SSE or WebSocket generation status (today: polling).
- Face-swap Phase 2: implement `FaceSwapProvider`, worker path, Characters UX.
- Real billing (careful: needs product decisions).
- Image generation / upscale / lip-sync (out of Phase 1 scope — discuss in an issue first).
- Internationalization.

Open an **issue** for large features before a long PR.

---

## PR checklist

- [ ] Branch from latest `main`.
- [ ] Mock provider path still works end-to-end.
- [ ] Shared contracts updated if the API shape changed.
- [ ] Migrations included if schema changed (`db:generate`, not hand-waved SQL only).
- [ ] `bun lint` / `bun check-types` / relevant `bun test` pass.
- [ ] PR description: **what** and **why**, screenshots for UI.
- [ ] No secrets committed (`.env` is gitignored; use examples only).

---

## Code style

- TypeScript throughout; prefer explicit types on exported APIs.
- Zod at the HTTP boundary (`parse` helper in the API).
- Match existing naming: `generationId`, kebab routes, camelCase JSON.
- Keep comments for non-obvious constraints (cookie proxy, credit locks, terminal vs transient provider errors) — avoid narrating obvious code.
- Do not reformat unrelated files.

---

## Issue etiquette

- Bugs: steps to reproduce, expected vs actual, env (`VIDEO_PROVIDER`, OS, browser).
- Features: user story + whether it fits Phase 1 scope or needs a design note.
- Security: do not file public exploits for auth/storage issues without coordinated disclosure if severe — open a private security advisory if the host supports it.

---

## Community norms

- Be kind in reviews; assume good intent.
- Prefer questions over drive-by rewrites of architecture.
- Credit others’ ideas in PR threads.

Welcome aboard — even a one-line preset or a docs typo PR helps.
