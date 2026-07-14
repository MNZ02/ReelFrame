import { drizzle, type NodePgDatabase, type NodePgTransaction } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
export type DbTransaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
/** Anything you can run a drizzle query against: the pool client or an open transaction. */
export type DbOrTx = Database | DbTransaction;

export function createDbClient(connectionString: string): {
  db: Database;
  pool: Pool;
} {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export type { Pool };
