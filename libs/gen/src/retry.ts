// REQ-GEN-005 / INV-GEN-005 — retry a terminally failed generation as a NEW row
// with retry_of provenance. The failed row is never mutated.
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { generation } from "./schema";

export class GenRetryError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export async function retryGeneration(db: Db, input: { generationId: string; principal: string }): Promise<string> {
  const [src] = await db.select().from(generation).where(eq(generation.id, input.generationId));
  if (!src) throw new GenRetryError("not_found", "Generation not found");
  if (src.status !== "failed") {
    throw new GenRetryError("conflict", "Only failed generations can be retried");
  }
  const id = uuidv7();
  await db.insert(generation).values({
    id,
    organizationId: src.organizationId,
    projectId: src.projectId,
    kind: src.kind,
    target: src.target,
    modelId: src.modelId,
    promptSnapshot: src.promptSnapshot, // identical context (INV-GEN-001 provenance preserved)
    params: src.params,
    commandId: uuidv7(), // new command — a retry is a new attempt, not a replay
    principal: input.principal,
    retryOf: src.id,
  });
  return id;
}
