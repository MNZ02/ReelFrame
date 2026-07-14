import type { Context, Next } from "hono";
import { auth, type Session } from "../auth";

declare module "hono" {
  interface ContextVariableMap {
    session: Session;
  }
}

/**
 * Requires a valid better-auth session cookie. Responds 401 with the shared
 * error shape when absent, otherwise stashes the session on the context.
 */
export async function requireSession(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      401,
    );
  }
  c.set("session", session as Session);
  await next();
}
