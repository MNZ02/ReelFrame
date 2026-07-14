import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit is invoked as its own CLI process with this package as cwd,
// so Bun's automatic .env loading (cwd-only) never sees the repo-root
// `.env`. Load it by hand, without overriding anything already set.
function loadRootEnv(): void {
  const rootEnvPath = path.join(import.meta.dirname, "..", "..", ".env");
  if (!existsSync(rootEnvPath)) return;
  for (const rawLine of readFileSync(rootEnvPath, "utf8").split("\n")) {
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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadRootEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://higgsfield:higgsfield@localhost:55432/higgsfield",
  },
});
