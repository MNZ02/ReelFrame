import { sql } from "drizzle-orm";
import { schema, type DbOrTx } from "@repo/db";
import { eq } from "drizzle-orm";

export async function getBalance(db: DbOrTx, userId: string): Promise<number> {
  const rows = await db
    .select({ balance: sql<string>`coalesce(sum(${schema.creditLedger.delta}), 0)` })
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, userId));
  return Number(rows[0]?.balance ?? 0);
}

/**
 * Acquires a per-user advisory lock scoped to the current transaction. Used
 * alongside SERIALIZABLE isolation to make the balance-check-then-spend
 * sequence deterministic under concurrency without a serialization-failure
 * retry loop.
 */
export async function lockUserForCredits(db: DbOrTx, userId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
}
