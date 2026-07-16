# 03 — HTTP API

Base URL (direct): `http://localhost:4000`  
Browser (via web rewrite): same origin, paths under `/api/...`

| Mount | Purpose |
|-------|---------|
| `GET /health` | Liveness |
| `/api/auth/*` | better-auth (sign-up, sign-in, session, OAuth) |
| `/api/v1/*` | Application API |

Unless noted, application routes expect a **session cookie** from better-auth. CORS allows `WEB_URL` with credentials.

Error body shape (all non-2xx handled errors):

```json
{ "error": { "code": "INSUFFICIENT_CREDITS", "message": "…" } }
```

| Code | Typical status |
|------|----------------|
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 400 |
| `INSUFFICIENT_CREDITS` | 402 |
| `INVALID_STATE` | 409 |
| `INTERNAL_ERROR` | 500 |

Request/response Zod schemas: `packages/shared/src/schemas.ts`.

---

## Auth (`/api/auth/*`)

Handled by better-auth. Web client uses the same paths through the Next rewrite. Email/password always on; Google only if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

---

## `GET /api/v1/me` — **auth required**

Current user + credit balance.

```json
{
  "id": "…",
  "email": "user@example.com",
  "name": "…",
  "credits": 100
}
```

---

## Uploads — **auth required**

### `POST /api/v1/uploads/presign`

```json
{
  "mimeType": "image/jpeg",
  "sizeBytes": 123456,
  "kind": "source_image"
}
```

- `mimeType` must start with `image/`.
- `sizeBytes` ≤ 10 MB.
- `kind`: `source_image` (default) or `face_source`.

Response:

```json
{
  "uploadUrl": "https://…presigned PUT…",
  "objectKey": "sources/…/….jpg"
}
```

Client: `PUT` raw bytes to `uploadUrl` with matching `Content-Type`.

### `POST /api/v1/uploads/confirm`

```json
{
  "objectKey": "sources/…/….jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 123456,
  "width": 1920,
  "height": 1080
}
```

Response: `MediaAsset` object including a presigned `url`.

---

## Catalog — **public** (no auth)

### `GET /api/v1/presets`

Motion-preset catalog from `MOTION_PRESETS` (slug, name, category, motion clause, thumbnail path).

### `GET /api/v1/models`

Video models available for the deployment’s `VIDEO_PROVIDER` (mock returns full catalog). Includes credit costs and capabilities (`supportsSourceImage`, aspect ratios).

---

## Generations

### `POST /api/v1/generations` — **auth required** → `201`

```json
{
  "prompt": "A lone astronaut on a red dune at sunset",
  "negativePrompt": "cartoon",
  "motionPreset": "crash-zoom",
  "model": "kling-video/v1.6/standard",
  "aspectRatio": "16:9",
  "durationSecs": 5,
  "sourceImageId": null,
  "isPublic": true
}
```

| Field | Rules |
|-------|--------|
| `prompt` | 1–2000 chars |
| `negativePrompt` | optional, ≤1000 |
| `motionPreset` | optional slug |
| `model` | required; must exist and match active provider |
| `aspectRatio` | `16:9` \| `9:16` \| `1:1` |
| `durationSecs` | `5` \| `10` |
| `sourceImageId` | optional UUID of owned `source_image` asset |
| `isPublic` | default `true` |

Side effects: debit credits, enqueue worker job, store `enhancedPrompt` / `negativePrompt`.

### `GET /api/v1/generations` — **auth required**

Own history (excludes soft-deleted). Query:

| Param | Description |
|-------|-------------|
| `cursor` | opaque pagination cursor |
| `status` | filter by generation status |
| `limit` | 1–100, default 20 |

Response: `{ "items": [Generation, …], "nextCursor": "…" | null }`.

### `GET /api/v1/generations/:id` — **auth required**

Owner detail including presigned `videoUrl` / `thumbnailUrl` / `sourceImageUrl` when present.

### `POST /api/v1/generations/:id/cancel` — **auth required**

Only while `queued`. Sets `canceled`, refunds credits.

### `PATCH /api/v1/generations/:id` — **auth required**

```json
{ "isPublic": false }
```

### `DELETE /api/v1/generations/:id` — **auth required**

Soft-hides (`deleted_at`) and best-effort deletes object-store objects for video/thumb.

---

## Explore — **public**

### `GET /api/v1/explore`

Succeeded, public, non-deleted generations. Same cursor pagination shape as list generations (`cursor`, `limit`).

---

## Face profiles — **auth required** (Phase 1 stub)

### `POST /api/v1/face-profiles`

```json
{
  "name": "Hero",
  "imageIds": ["uuid", "…"]
}
```

Creates profile in `pending` with linked face images. No processing worker yet.

### `GET /api/v1/face-profiles`

List current user’s profiles with image URLs.

---

## Generation response object

Shared shape (`generationResponseSchema`):

```ts
{
  id: string
  status: "queued" | "processing" | "succeeded" | "failed" | "canceled"
  prompt: string
  enhancedPrompt: string | null
  negativePrompt: string | null
  motionPreset: string | null
  model: string
  provider: "fal" | "mock" | "replicate"
  aspectRatio: "16:9" | "9:16" | "1:1"
  durationSecs: number
  creditsCost: number
  sourceImageUrl: string | null
  videoUrl: string | null
  thumbnailUrl: string | null
  isPublic: boolean
  errorMessage: string | null
  createdAt: string  // ISO
  startedAt: string | null
  completedAt: string | null
}
```

---

## Route modules

| File | Routes |
|------|--------|
| `apps/api/src/routes/me.ts` | `/me` |
| `apps/api/src/routes/uploads.ts` | `/uploads/*` |
| `apps/api/src/routes/presets.ts` | `/presets` |
| `apps/api/src/routes/models.ts` | `/models` |
| `apps/api/src/routes/generations.ts` | `/generations/*` |
| `apps/api/src/routes/explore.ts` | `/explore` |
| `apps/api/src/routes/face-profiles.ts` | `/face-profiles` |
| `apps/api/src/app.ts` | mount + CORS + error handler |

Session middleware: `apps/api/src/middleware/session.ts` (`requireSession`).
