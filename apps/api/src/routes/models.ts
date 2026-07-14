import { Hono } from "hono";
import { VIDEO_MODELS } from "@repo/shared";

export const modelRoutes = new Hono();

// Public: static catalog data, no user-private information.
modelRoutes.get("/models", (c) => {
  return c.json(VIDEO_MODELS);
});
