import { Hono } from "hono";
import { MOTION_PRESETS } from "@repo/shared";

export const presetRoutes = new Hono();

// Public: static catalog data, no user-private information.
presetRoutes.get("/presets", (c) => {
  return c.json(MOTION_PRESETS);
});
