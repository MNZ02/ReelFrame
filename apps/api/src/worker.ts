import type { Job } from "pg-boss";
import { getBoss, GENERATION_QUEUE, type GenerationJobData } from "./queue";
import { processGeneration } from "./pipeline";
import { env } from "./env";

async function main() {
  const boss = await getBoss();

  console.log(`[worker] ready, provider=${env.VIDEO_PROVIDER}`);

  await boss.work<GenerationJobData>(GENERATION_QUEUE, async (jobs: Job<GenerationJobData>[]) => {
    for (const job of jobs) {
      console.log(`[worker] processing generation ${job.data.generationId}`);
      try {
        await processGeneration(job.data.generationId);
      } catch (err) {
        console.error(`[worker] transient error on generation ${job.data.generationId}, will retry:`, err);
        // Rethrow so pg-boss applies the queue's retryLimit/backoff. Any
        // provider-reported terminal failure is handled inside
        // processGeneration (refund, no throw) and never reaches here.
        throw err;
      }
    }
  });
}

main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});
