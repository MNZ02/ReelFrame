# 02 — Data model

Postgres schema is defined with Drizzle in `packages/db/src/schema/` and applied via `packages/db/migrations/`.

- Auth tables: `packages/db/src/schema/auth.ts` (better-auth managed shape).
- App tables: `packages/db/src/schema/app.ts`.

---

## Entity overview

```
user ──┬── credit_ledger
     ├── media_assets
     ├── generations ──┬── source/video/thumbnail → media_assets
     │                 └── face_profile_id → face_profiles (optional)
     └── face_profiles ── face_profile_images ── media_assets
```

---

## Enums

| Enum | Values |
|------|--------|
| `ledger_reason` | `signup_grant`, `generation`, `refund`, `admin_grant` |
| `media_kind` | `source_image`, `video`, `thumbnail`, `face_source` |
| `generation_status` | `queued`, `processing`, `succeeded`, `failed`, `canceled` |
| `generation_provider` | `fal`, `mock`, `replicate` |
| `aspect_ratio` | `16:9`, `9:16`, `1:1` |
| `face_profile_status` | `pending`, `ready`, `failed` |

---

## Tables

### better-auth (`user`, `session`, `account`, `verification`)

Standard better-auth schema. App code references `user.id` as `text` foreign keys.

### `credit_ledger`

Append-only credit movements. **Balance = `SUM(delta)`** for the user (never a stored balance column).

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `user_id` | text FK → user | cascade delete |
| `delta` | int | positive grant/refund, negative spend |
| `reason` | ledger_reason | |
| `generation_id` | uuid nullable | links spend/refund to a job |
| `created_at` | timestamptz | |

**Constraints / rules:**

- Partial unique index: at most one row with `reason = 'signup_grant'` per user.
- Signup grant: `delta = +100` (`SIGNUP_GRANT_CREDITS` in `apps/api/src/env.ts`).
- Generation spend: negative delta equal to model cost for duration.
- Failure / cancel (while queued): matching positive `refund` delta.
- Spend path uses transaction + `pg_advisory_xact_lock(hashtext(userId))` so concurrent creates cannot overdraw.

### `media_assets`

Every file stored in the object store.

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `user_id` | text FK | owner |
| `kind` | media_kind | |
| `bucket` | text | usually `media` |
| `object_key` | text | path inside bucket |
| `mime_type` | text | |
| `size_bytes` | bigint | |
| `width` / `height` | int nullable | images/video when known |
| `duration_ms` | int nullable | video when known |
| `created_at` | timestamptz | |

Playback URLs are **not** stored; they are presigned at response time.

### `generations`

One row per generation job.

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | also used in object keys |
| `user_id` | text FK | |
| `status` | generation_status | default `queued` |
| `prompt` | text | raw user subject |
| `enhanced_prompt` | text nullable | composed prompt sent to provider |
| `negative_prompt` | text nullable | defaults + user extras |
| `motion_preset` | text nullable | slug from catalog |
| `model` | text | catalog slug |
| `provider` | generation_provider | frozen at create time |
| `provider_job_id` | text nullable | remote job id |
| `aspect_ratio` | aspect_ratio | |
| `duration_secs` | int | 5 or 10 (UI); some providers ignore |
| `credits_cost` | int | debited amount |
| `source_image_id` | uuid FK nullable → media_assets | |
| `video_asset_id` | uuid FK nullable | |
| `thumbnail_id` | uuid FK nullable | |
| `face_profile_id` | uuid FK nullable | Phase 2 |
| `is_public` | bool | default true; feeds Explore |
| `error_message` | text nullable | user-facing failure text |
| `created_at` / `started_at` / `completed_at` | timestamptz | |
| `deleted_at` | timestamptz nullable | soft-hide (DELETE endpoint) |

**List queries** exclude `deleted_at IS NOT NULL`. Explore lists only `status = succeeded`, `is_public = true`, not deleted.

### `face_profiles` / `face_profile_images`

Phase 1 scaffolding only:

- Profile: `name`, `status` (default `pending`).
- Images: join to `media_assets` of kind `face_source`.
- No worker path sets profiles to `ready` yet.

---

## Object key conventions

Implemented in `apps/api/src/lib/object-keys.ts` (authoritative). Conceptual layout:

```
sources/{userId}/{uuid}.{ext}
videos/{userId}/{generationId}.mp4
thumbs/{userId}/{generationId}.jpg
faces/{userId}/{profileId}/{uuid}.jpg
```

Normalized start images for cloud providers are written under generation-scoped keys so original uploads stay intact.

---

## Credits cost source of truth

Not a DB table — catalog in `packages/shared/src/models.ts` (`VIDEO_MODELS[].creditsCostPerGeneration` for `"5"` / `"10"` seconds). Create path resolves cost via `getCreditsCost(model, durationSecs)` and stores it on the generation row + ledger.

| Model slug | Provider | 5s | 10s |
|------------|----------|----|-----|
| `kling-video/v2/master` | fal | 20 | 35 |
| `kling-video/v1.6/standard` | fal | 10 | 18 |
| `minimax/video-01` | replicate | 10 | 10 (flat; clip length fixed by model) |

Default model slug: `kling-video/v1.6/standard`.

---

## Migrations

```bash
bun db:generate   # after schema edits
bun db:migrate    # apply
```

Migration SQL lives in `packages/db/migrations/`. Do not hand-edit applied production migrations; add a new one.

---

## Related code

| Concern | Location |
|---------|----------|
| Schema | `packages/db/src/schema/app.ts`, `auth.ts` |
| Balance + lock | `apps/api/src/lib/credits.ts` |
| Create + debit | `apps/api/src/lib/create-generation.ts` |
| Cancel + refund | `apps/api/src/lib/cancel-generation.ts` |
| Pipeline refund on fail | `apps/api/src/pipeline.ts` |
