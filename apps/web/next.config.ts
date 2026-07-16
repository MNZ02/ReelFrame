import path from "node:path";
import type { NextConfig } from "next";

// Real API origin. Browser traffic still hits this app's /api/* (same origin);
// rewrites forward to the API so better-auth session cookies stay first-party.
// Cross-site cookies (web on Vercel, API on another host) are blocked by
// modern browsers, which left users stuck on /login after a "successful" sign-in.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
