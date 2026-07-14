import { Hono } from "hono";
import { VIDEO_MODELS } from "@repo/shared";
import { requireSession } from "../middleware/session";

export const modelRoutes = new Hono();

modelRoutes.get("/models", requireSession, (c) => {
  return c.json(VIDEO_MODELS);
});
