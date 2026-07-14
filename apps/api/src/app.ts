import { Hono } from "hono";
import { cors } from "hono/cors";
import { ApiError } from "@repo/shared";
import { auth } from "./auth";
import { env } from "./env";
import { meRoutes } from "./routes/me";
import { uploadRoutes } from "./routes/uploads";
import { presetRoutes } from "./routes/presets";
import { modelRoutes } from "./routes/models";
import { generationRoutes } from "./routes/generations";
import { exploreRoutes } from "./routes/explore";
import { faceProfileRoutes } from "./routes/face-profiles";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: env.WEB_URL,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  // better-auth's own handler, mounted directly (not under /api/v1).
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  const v1 = new Hono();
  v1.route("/", meRoutes);
  v1.route("/", uploadRoutes);
  v1.route("/", presetRoutes);
  v1.route("/", modelRoutes);
  v1.route("/", generationRoutes);
  v1.route("/", exploreRoutes);
  v1.route("/", faceProfileRoutes);

  app.route("/api/v1", v1);

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(err.toBody(), err.status as 400 | 401 | 402 | 403 | 404 | 409 | 500);
    }
    console.error("[api] unhandled error", err);
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      500,
    );
  });

  app.notFound((c) =>
    c.json({ error: { code: "NOT_FOUND", message: "Not found" } }, 404),
  );

  return app;
}
