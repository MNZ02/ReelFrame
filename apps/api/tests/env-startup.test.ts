import path from "node:path";
import { describe, expect, test } from "bun:test";

const API_ROOT = path.join(import.meta.dir, "..");

/**
 * These spawn a fresh bun process so we can observe module-load-time
 * (i.e. "startup") behavior of ../src/env.ts, which can't be exercised
 * in-process once the module is cached with a given VIDEO_PROVIDER.
 */
describe("env.ts startup validation (acceptance #1: replicate token required only in replicate mode)", () => {
  test("VIDEO_PROVIDER=replicate with no REPLICATE_API_TOKEN fails fast with a clear error", () => {
    const result = Bun.spawnSync({
      cmd: ["bun", "-e", "import('./src/env.ts')"],
      cwd: API_ROOT,
      env: { ...process.env, VIDEO_PROVIDER: "replicate", REPLICATE_API_TOKEN: "" },
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toMatch(/REPLICATE_API_TOKEN/);
  });

  test("VIDEO_PROVIDER=replicate with REPLICATE_API_TOKEN set starts up fine", () => {
    const result = Bun.spawnSync({
      cmd: ["bun", "-e", "import('./src/env.ts')"],
      cwd: API_ROOT,
      env: { ...process.env, VIDEO_PROVIDER: "replicate", REPLICATE_API_TOKEN: "r8_fake_token" },
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(result.exitCode).toBe(0);
  });

  test("VIDEO_PROVIDER=mock does not require REPLICATE_API_TOKEN", () => {
    const result = Bun.spawnSync({
      cmd: ["bun", "-e", "import('./src/env.ts')"],
      cwd: API_ROOT,
      env: { ...process.env, VIDEO_PROVIDER: "mock", REPLICATE_API_TOKEN: "" },
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(result.exitCode).toBe(0);
  });

  test("VIDEO_PROVIDER=fal does not require REPLICATE_API_TOKEN", () => {
    const result = Bun.spawnSync({
      cmd: ["bun", "-e", "import('./src/env.ts')"],
      cwd: API_ROOT,
      env: { ...process.env, VIDEO_PROVIDER: "fal", REPLICATE_API_TOKEN: "" },
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(result.exitCode).toBe(0);
  });
});
