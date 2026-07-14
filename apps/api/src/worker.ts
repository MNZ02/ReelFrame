import type { JobWithMetadata } from "pg-boss";
import { getBoss, GENERATION_QUEUE, type GenerationJobData } from "./queue";
import { processGeneration, isFinalAttempt, handleExhaustedRetries } from "./pipeline";
import { env } from "./env";

async function main() {
  const boss = await getBoss();

  console.log(`[worker] ready, provider=${env.VIDEO_PROVIDER}`);

  await boss.work(
    GENERATION_QUEUE,
    { includeMetadata: true } as const,
    async (jobs: JobWithMetadata<GenerationJobData>[]) => {
      for (const job of jobs) {
        console.log(
          `[worker] processing generation ${job.data.generationId} (attempt ${job.retryCount + 1}/${job.retryLimit + 1})`,
        );
        try {
          await processGeneration(job.data.generationId);
        } catch (err) {
          if (isFinalAttempt(job)) {
            // pg-boss will not retry this job again — handle it as a
            // terminal failure ourselves (status='failed' + refund), the
            // same as the poll-timeout / provider-failure paths inside
            // processGeneration, instead of letting the generation stay
            // stuck in `processing` with its credits never returned.
            console.error(
              `[worker] generation ${job.data.generationId} failed on its final attempt, marking failed + refunding:`,
              err,
            );
            await handleExhaustedRetries(job.data.generationId, err);
            continue;
          }
          console.error(`[worker] transient error on generation ${job.data.generationId}, will retry:`, err);
          // Rethrow so pg-boss applies the queue's retryLimit/backoff. Any
          // provider-reported terminal failure is handled inside
          // processGeneration (refund, no throw) and never reaches here.
          throw err;
        }
      }
    },
  );
}

main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});
