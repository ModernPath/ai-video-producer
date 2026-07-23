// apps/worker — pg-boss consumer for generations and exports (docs/03 §2, REQ-GEN-016).
import { createDb } from "@avd/shared/db";
import { createBoss, EXPORT_QUEUE, GEN_QUEUE, type ExportJob, type GenJob } from "@avd/shared/queue";
import { handleExport, handleGeneration } from "./handlers";

async function main() {
  const { db } = createDb();
  const boss = await createBoss();

  await boss.work<GenJob>(GEN_QUEUE, { batchSize: 3 }, async (jobs) => {
    for (const job of jobs) {
      console.log(`[worker] gen ${job.data.generationId}`);
      await handleGeneration(db, job.data);
    }
  });

  await boss.work<ExportJob>(EXPORT_QUEUE, { batchSize: 1 }, async (jobs) => {
    for (const job of jobs) {
      console.log(`[worker] export ${job.data.exportJobId}`);
      await handleExport(db, job.data);
    }
  });

  console.log("[worker] ready — queues:", GEN_QUEUE, EXPORT_QUEUE);
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
