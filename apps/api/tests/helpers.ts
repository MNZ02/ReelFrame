import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { schema } from "@repo/db";
import { db } from "../src/db";

/** Creates a throwaway user directly (bypassing better-auth) for tests. */
export async function createTestUser(): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.user).values({
    id,
    name: "Test User",
    email: `test-${id}@example.com`,
  });
  return id;
}

export async function grantCredits(userId: string, amount: number): Promise<void> {
  await db.insert(schema.creditLedger).values({
    userId,
    delta: amount,
    reason: "admin_grant",
  });
}

/** Cascades to credit_ledger / generations / media_assets rows for this user. */
export async function deleteTestUser(userId: string): Promise<void> {
  await db.delete(schema.user).where(eq(schema.user.id, userId));
}
