import { Hono } from "hono";
import { MOTION_PRESETS } from "@repo/shared";
import { requireSession } from "../middleware/session";

export const presetRoutes = new Hono();

presetRoutes.get("/presets", requireSession, (c) => {
  return c.json(MOTION_PRESETS);
});
