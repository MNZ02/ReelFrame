# Migration runbook — Oracle single-VM → Vercel + Neon + R2

Moves the stack off one Oracle VM to:

- **Web** (`apps/web`) → **Vercel**
- **Postgres** → **Neon** (also hosts the `pg-boss` job queue schema)
- **Media** (uploads / generated video / thumbnails) → **Cloudflare R2**
- **API + worker** → **stay on the Oracle VM**, behind Caddy (auto-TLS)

Domain strategy: **Vercel URL + separate API domain** (no custom domain).
The API is served over HTTPS at `https://<dashed-public-ip>.sslip.io` so
cross-site auth cookies work.

---

## Why it's not just "lift the three pieces"

1. **The backend can't go to Vercel.** `apps/api` is a persistent Bun/Hono
   server and `worker.ts` is a separate long-running process. Both stay on the VM.
2. **The job queue lives in Postgres (`pg-boss`).** It needs `LISTEN/NOTIFY`
   + a session-mode connection, so the API/worker must use Neon's **direct
   (unpooled)** connection string, not the pooled pgBouncer one.
3. **Auth cookies become cross-site.** Same-origin Caddy glue goes away, so
   cookies must be `sameSite=none; secure` and the API must be HTTPS.

---

## Phase 0 — Accounts & facts to collect

- [ ] Oracle VM **public IP** → dashed sslip.io host, e.g. `92-4-85-148.sslip.io`
- [ ] Neon account + project
- [ ] Cloudflare account (R2 enabled) + account ID
- [ ] Vercel account, GitHub repo access (`MNZ02/ReelFrame`)
- [ ] SSH into the VM confirmed (keys in `~/Downloads`)

---

## Phase 1 — Neon (database)

1. Create a Neon project (Postgres 17 to match).
2. Copy the **Direct connection** string (NOT "Pooled"). Ensure it ends with
   `?sslmode=require`. This one string is used by both Drizzle and pg-boss.
3. **Migrate existing data** (dump from the VM, restore into Neon) — this
   carries app tables *and* the `pgboss` schema/data:
   ```bash
   # on the VM
   docker compose -f docker-compose.prod.yml exec -T postgres \
     pg_dump -U higgsfield -d higgsfield --no-owner --no-acl > /tmp/dump.sql

   # from anywhere with psql + network to Neon
   psql "postgresql://…neon-direct…/neondb?sslmode=require" < /tmp/dump.sql
   ```
   *(Fresh start instead of data migration? Skip the dump and run
   `DATABASE_URL=<neon> bun run db:migrate` from the repo root.)*
4. Sanity check: `psql "<neon-url>" -c "\dt"` shows `user`, `generation`,
   `credit_ledger`, … and `psql "<neon-url>" -c "\dn"` shows schema `pgboss`.

---

## Phase 2 — Cloudflare R2 (media)

1. Create bucket **`media`** (keep it **private** — the app serves everything
   via presigned URLs, no public bucket needed).
2. Create an **R2 API token** (Object Read & Write) → gives an S3
   access key + secret. Note the S3 endpoint:
   `https://<account_id>.r2.cloudflarestorage.com`.
3. **Bucket CORS** — needed for browser PUT uploads and playback. In the
   bucket's CORS policy allow the Vercel origin:
   ```json
   [{
     "AllowedOrigins": ["https://<your-app>.vercel.app"],
     "AllowedMethods": ["GET", "PUT", "HEAD"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3600
   }]
   ```
4. **Copy existing objects** MinIO → R2 (run on the VM with `rclone`):
   ```bash
   # rclone config: remote "minio" (S3, endpoint http://localhost:9000, the
   # MinIO keys) and remote "r2" (S3, R2 endpoint + R2 keys, region auto)
   rclone copy minio:media r2:media --progress
   ```
5. R2 env values for later:
   - `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
   - `S3_PUBLIC_ENDPOINT=` **same as above** (R2's S3 endpoint is already
     public HTTPS — browser presigns and provider fetches both use it)
   - `S3_REGION=auto`
   - `S3_ACCESS_KEY` / `S3_SECRET_KEY` = the R2 token
   - `S3_BUCKET=media`

   `apps/api/src/lib/s3.ts` already uses `forcePathStyle` + endpoint override,
   so no code change — R2 drops in.

---

## Phase 3 — VM: slim down to API + worker + Caddy

### 3a. Code change — cross-site auth cookies
`apps/api/src/auth.ts`:
```diff
 defaultCookieAttributes: {
-  sameSite: "lax",
-  secure: false,
+  sameSite: "none",
+  secure: true,
 },
```

### 3b. Caddyfile — TLS-terminate + proxy the API only
Replace `deploy/Caddyfile` with:
```caddy
# Web now lives on Vercel; the VM only fronts the API. The sslip.io hostname
# resolves to this VM's public IP, so Caddy provisions a Let's Encrypt cert
# automatically over HTTPS.
92-4-85-148.sslip.io {
	reverse_proxy api:4000
}
```
And publish 443 (+80 for the ACME challenge) instead of 80 in the compose
`caddy` service.

### 3c. Slim `docker-compose.prod.yml`
Remove services: `postgres`, `minio`, `minio-init`, `web` (and their volumes
`pgdata`, `miniodata`). Keep `api`, `worker`, `caddy`. Drop the `depends_on:
postgres/minio` conditions on api/worker.

### 3d. VM `.env`
```env
# DB — Neon DIRECT (unpooled) + sslmode
DATABASE_URL=postgresql://…neon-direct…/neondb?sslmode=require

# R2
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=<r2_key>
S3_SECRET_KEY=<r2_secret>
S3_BUCKET=media
S3_REGION=auto

# Auth / origins  (HTTPS both sides)
BETTER_AUTH_SECRET=<keep existing 32+ char secret>
BETTER_AUTH_URL=https://92-4-85-148.sslip.io
WEB_URL=https://<your-app>.vercel.app     # set after Phase 4

# Video + prompt enhancement (unchanged from current prod)
VIDEO_PROVIDER=replicate
REPLICATE_API_TOKEN=<token>
PROMPT_ENHANCER=rule
API_PORT=4000
```

### 3e. Firewall — the classic Oracle gotcha
Open **443** and **80** (443 for the API, 80 for Let's Encrypt HTTP-01), and
you can now **close 9000** (MinIO is gone). Two layers:
- Oracle Cloud **Security List / NSG**: ingress for TCP 80 and 443.
- **On the VM** Oracle images block ports in iptables:
  ```bash
  sudo iptables -I INPUT -p tcp --dport 80  -j ACCEPT
  sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
  sudo netfilter-persistent save
  ```

### 3f. Bring it up
```bash
docker compose -f docker-compose.prod.yml up -d --build
curl https://92-4-85-148.sslip.io/health   # -> {"ok":true}
```

---

## Phase 4 — Vercel (web)

1. Import `MNZ02/ReelFrame`. **Root Directory = `apps/web`** (Vercel handles
   the bun workspace install from repo root; framework preset **Next.js**).
2. Env var: `NEXT_PUBLIC_API_URL = https://92-4-85-148.sslip.io`
   (baked at build — set before the build).
3. Deploy → note the production URL `https://<your-app>.vercel.app`.
4. Back on the VM: set `WEB_URL=https://<your-app>.vercel.app` in `.env`, then
   `docker compose -f docker-compose.prod.yml up -d api worker` to pick it up
   (drives CORS `origin` and better-auth `trustedOrigins`).

> **Preview deploys won't auth.** CORS allows exactly one `WEB_URL`, so
> only the production URL works. Fine for now; a custom domain later fixes it.

---

## Phase 5 — End-to-end verification

- [ ] `GET https://<sslip>/health` → `{"ok":true}`
- [ ] Load the Vercel app; sign up → a session cookie is set (DevTools →
      Application → Cookies on the API domain, `SameSite=None; Secure`)
- [ ] Reload → still logged in (cookie persists cross-site)
- [ ] Upload a source image → lands in R2 (`rclone ls r2:media` or dashboard)
- [ ] Start a generation → worker picks it up (pg-boss on Neon), video plays
      back from an R2 presigned URL
- [ ] Credits decrement (confirms Neon writes)

---

## Phase 6 — Decommission

- [ ] After a stable day, `docker compose` no longer references pg/minio — the
      old `pgdata`/`miniodata` volumes can be removed once R2 + Neon are verified.
- [ ] Enable Neon's PITR / backups; R2 is durable but consider lifecycle rules.
- [ ] Rotate any secrets that ever lived in the old `.env`.

---

## Rollback

Nothing is deleted until Phase 6. To roll back: point `.env` back to the local
`postgres`/`minio` services, restore the original `Caddyfile` + compose, and
`up -d --build`. Neon and R2 can be torn down independently.
