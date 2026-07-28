// Worker job handlers — compose GEN execution with STB materialization and ASM export.
// Kept pure (db injected) so they are testable without the daemon loop.
import type { Db } from "@avd/shared/db";
import { runGenerationById, type GenProvider } from "@avd/gen";
import { materializeGenerationOutput, runChainForShot } from "@avd/stb";
import { runExportById } from "@avd/asm";

export async function handleGeneration(
  db: Db,
  payload: { generationId: string },
  provider?: GenProvider
): Promise<void> {
  const result = await runGenerationById(db, payload.generationId, provider);
  if (result?.status === "succeeded") {
    await materializeGenerationOutput(db, payload.generationId); // docs/41 choreography
  }
}

export async function handleExport(db: Db, payload: { exportJobId: string }): Promise<void> {
  await runExportById(db, payload.exportJobId);
}

/**
 * REQ-STB-067 — a whole continuity chain. Runs here rather than in a server action because it
 * generates a video per shot and waits for each one; that is minutes, and an HTTP request cannot
 * hold it open. Already-selected shots are skipped, so a retry after a worker restart resumes
 * instead of re-buying takes.
 */
export async function handleChain(
  db: Db,
  payload: { shotId: string; principal: string; aspectRatio: "16:9" | "9:16" }
): Promise<void> {
  const steps = await runChainForShot(db, payload);
  const failed = steps.find((s) => s.status === "failed");
  console.log(
    `[worker] chain ${payload.shotId}: ${steps.filter((s) => s.status === "generated").length} generated, ` +
      `${steps.filter((s) => s.status === "skipped").length} already had takes` +
      (failed ? ` — STOPPED at "${failed.title}"` : "")
  );
}
