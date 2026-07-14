import { PgBoss } from "pg-boss";
import { env } from "./env";

export const GENERATION_QUEUE = "generation";

export interface GenerationJobData {
  generationId: string;
}

let bossPromise: Promise<PgBoss> | null = null;

/**
 * Lazily creates and starts a single shared PgBoss instance per process,
 * and ensures the `generation` queue exists with the retry policy from the
 * product spec (retryLimit 2, for transient errors only — provider-reported
 * terminal failures are handled inside the job and never throw).
 */
export async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss(env.DATABASE_URL);
      boss.on("error", (err: Error) => console.error("[pg-boss] error", err));
      await boss.start();
      await boss.createQueue(GENERATION_QUEUE, {
        retryLimit: 2,
        retryBackoff: true,
      });
      return boss;
    })();
  }
  return bossPromise;
}
