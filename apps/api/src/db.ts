import { createDbClient } from "@repo/db";
import { env } from "./env";

export const { db, pool } = createDbClient(env.DATABASE_URL);
