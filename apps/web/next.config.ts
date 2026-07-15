import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Pin the workspace root to this repo checkout — without this Next.js can
    // walk up past a worktree into an unrelated ancestor lockfile.
    root: path.join(__dirname, "..", ".."),
  },
  // Type-checking and linting run as their own turbo tasks (check-types, lint);
  // re-running them inside `next build` is redundant and, on a memory-limited
  // host (e.g. a 1 GB VM), thrashes swap. Skip them in the production build.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
