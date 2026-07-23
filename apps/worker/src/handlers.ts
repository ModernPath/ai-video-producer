// Worker job handlers — compose GEN execution with STB materialization and ASM export.
// Kept pure (db injected) so they are testable without the daemon loop.
import type { Db } from "@avd/shared/db";
import { runGenerationById, type GenProvider } from "@avd/gen";
import { materializeGenerationOutput } from "@avd/stb";
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
