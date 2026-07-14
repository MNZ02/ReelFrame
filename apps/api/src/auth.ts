import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { schema } from "@repo/db";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { env, SIGNUP_GRANT_CREDITS } from "./env";

const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: [env.WEB_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined,
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Grants the signup bonus right after the user row lands. better-auth
        // does not wrap create + hooks in a single SQL transaction (this
        // version), so true atomicity isn't available through the hook API.
        // We approximate it: the ledger insert is idempotent (unique
        // per-user signup_grant row) and, if it fails, we compensate by
        // deleting the just-created user so we never leave a creditless
        // account behind.
        after: async (user) => {
          try {
            await db.insert(schema.creditLedger).values({
              userId: user.id,
              delta: SIGNUP_GRANT_CREDITS,
              reason: "signup_grant",
            });
          } catch (err) {
            try {
              await db.delete(schema.user).where(eq(schema.user.id, user.id));
            } catch {
              // best effort compensation; original error still surfaces below
            }
            throw err;
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
