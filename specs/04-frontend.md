# 04 — Frontend (`apps/web`)

Next.js 15 App Router UI for ReelFrame. Dark, card-grid aesthetic; cinematic presets front and center.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router), React 19 |
| Styling | Tailwind CSS v4, shadcn-style primitives under `src/components/ui/` |
| Data | TanStack Query |
| Auth client | better-auth (`src/lib/auth-client.ts`) |
| Icons | lucide-react |
| Toasts | sonner |
| Shared types | `@repo/shared` |

---

## Same-origin API access

```ts
// src/lib/api.ts
export const API_URL = ""; // browser always hits this Next origin
```

`next.config.ts` rewrites:

```
/api/:path*  →  ${NEXT_PUBLIC_API_URL}/api/:path*
```

So session cookies stay first-party. Do **not** point the browser fetch client at the raw API host in production splits (Vercel + remote API) without re-validating cookie behavior.

---

## Routes

| Path | Auth | Purpose |
|------|------|---------|
| `/` | public | Landing: hero + preset showcase reel |
| `/login`, `/signup` | public | Auth forms (+ Google when configured) |
| `/explore` | public | Public generation grid; detail dialog; “Use this prompt” |
| `/create` | required | Core create flow |
| `/library` | required | Own generations, filters, public toggle, delete |
| `/generations/[id]` | required | Player + metadata + download |
| `/credits` | required | Balance + ledger; buy buttons are stubs |
| `/characters` | required | Face-profile form stub (“coming soon” for swap) |

Layouts under authenticated sections typically wrap with `RequireAuth`.

---

## Create page (core UX)

Components under `src/components/create/`:

| Piece | Role |
|-------|------|
| Prompt textarea | User subject (and optional negative) |
| `ImageDropzone` | Optional start image → presign → PUT → confirm |
| `PresetGrid` | Single-select motion presets by category |
| Model / aspect / duration selectors | From `/models` + fixed enums |
| Generate button | Shows credit cost; handles `INSUFFICIENT_CREDITS` → credits modal |
| `GenerationRail` | Recent jobs with live status (Query polling) |

Preset thumbnails are static assets in `public/presets/{slug}.svg`, resolved via `src/lib/presets.ts`.

Prompt composition for **preview** uses the same `buildEnhancedPrompt` from `@repo/shared` as the API, so the enhanced string does not diverge.

---

## Data hooks

Under `src/lib/hooks/`:

| Hook | Backing endpoints |
|------|-------------------|
| `use-me` | `GET /me` |
| `use-catalog` | `GET /presets`, `GET /models` |
| `use-generations` | list / detail / create / cancel / patch / delete |
| `use-explore` | `GET /explore` |
| `use-face-profiles` | face-profile CRUD stub |
| `use-upload` | presign + confirm + browser PUT |

In-flight generations: poll detail/list while status ∈ `{queued, processing}`.

Errors: `ApiRequestError` carries `code` / `status` for special cases (especially `INSUFFICIENT_CREDITS`).

---

## UI components map

```
src/components/
  auth/require-auth.tsx
  characters/face-profile-form.tsx
  create/…                 # create-screen widgets
  explore/…                # cards + detail dialog
  generation/…             # card, detail, status badge
  layout/header.tsx
  library/library-card.tsx
  ui/                      # button, card, dialog, tabs, …
```

Global chrome: root `layout.tsx` + `Header` (nav, credits chip when signed in).

---

## Auth UX

- Sign up / login pages call better-auth client methods.
- After success, user lands in app; header reflects session.
- `RequireAuth` waits for session query then redirects to `/login` if missing.
- Signup triggers API-side **100 credit** grant (visible on next `/me`).

---

## Environment (web)

| Variable | Meaning |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Origin of the Hono API used **only** in Next rewrites (and build-time). Not used as browser `fetch` base when rewrite pattern is active. |

Local default: `http://localhost:4000` (see root `.env.example`).

---

## Build notes

- `next build` skips embedded typecheck/eslint (`ignoreBuildErrors` / `ignoreDuringBuilds`) — turbo tasks `check-types` and `lint` own that work (important on small VMs).
- Turbopack `root` is pinned to the monorepo root so worktrees do not pick wrong lockfiles.
