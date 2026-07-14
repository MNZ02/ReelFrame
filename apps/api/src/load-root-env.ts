/**
 * Loads the repo-root `.env` into process.env, without overriding anything
 * already set (real shell exports / CI secrets always win). Bun only
 * auto-loads a `.env` from the process's cwd, and our workspace scripts run
 * with cwd set to this package (or a filtered subprocess) rather than the
 * repo root, so we do this by hand. Side-effect only; import for effect.
 */
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadRootEnv(): void {
  const rootEnvPath = path.join(import.meta.dir, "..", "..", "..", ".env");
  if (!existsSync(rootEnvPath)) return;
  const parsed = parseEnvFile(readFileSync(rootEnvPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();
