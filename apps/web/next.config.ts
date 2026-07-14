import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Pin the workspace root to this repo checkout — without this Next.js can
    // walk up past a worktree into an unrelated ancestor lockfile.
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
