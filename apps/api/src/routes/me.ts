import { Hono } from "hono";
import type { MeResponse } from "@repo/shared";
import { db } from "../db";
import { getBalance } from "../lib/credits";
import { requireSession } from "../middleware/session";

export const meRoutes = new Hono();

meRoutes.get("/me", requireSession, async (c) => {
  const session = c.get("session");
  const credits = await getBalance(db, session.user.id);
  const body: MeResponse = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    credits,
  };
  return c.json(body);
});
