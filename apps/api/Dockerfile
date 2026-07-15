# Build context is the repo ROOT (see docker-compose.prod.yml). The API and
# packages run directly from TypeScript under Bun — there is no compile step —
# so this image just installs workspace deps and runs the entrypoint. The same
# image serves both the API server and the pg-boss worker (command differs).
FROM oven/bun:1.3.3

WORKDIR /app

# Full monorepo (node_modules/.next excluded via .dockerignore) so Bun can
# resolve the @repo/* workspace packages the API imports.
COPY . .

RUN bun install --frozen-lockfile

ENV NODE_ENV=production
WORKDIR /app/apps/api

EXPOSE 4000

# Overridden to start:worker for the worker service in compose.
CMD ["bun", "run", "start:api"]
