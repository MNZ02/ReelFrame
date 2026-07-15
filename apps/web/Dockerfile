# Build context is the repo ROOT (see docker-compose.prod.yml). Next.js needs
# a real build; NEXT_PUBLIC_API_URL is inlined into the client bundle at build
# time, so it is passed as a build arg (not a runtime env var).
FROM oven/bun:1.3.3

WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app/apps/web
RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
