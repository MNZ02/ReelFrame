import { Hono } from "hono";
import { getModelsForProvider } from "@repo/shared";
import { env } from "../env";

export const modelRoutes = new Hono();

// Public: static catalog data, no user-private information. Filtered to the
// models the active video provider can actually run, so the create form never
// offers a model that would fail at generation time.
modelRoutes.get("/models", (c) => {
  return c.json(getModelsForProvider(env.VIDEO_PROVIDER));
});
