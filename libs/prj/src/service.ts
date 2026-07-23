// REQ-PRJ-002 — idempotent project creation (docs/07 §3 command envelope).
import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { project } from "./schema";

export async function createProject(
  db: Db,
  input: {
    organizationId: string;
    title: string;
    aspectRatio: "16:9" | "9:16";
    commandId: string;
    idea?: string | undefined;
    targetDurationSeconds?: number | undefined;
  }
): Promise<string> {
  const [existing] = await db
    .select()
    .from(project)
    .where(and(eq(project.organizationId, input.organizationId), eq(project.commandId, input.commandId)));
  if (existing) return existing.id; // replay returns the original (REQ-PRJ-002)

  const id = uuidv7();
  await db
    .insert(project)
    .values({
      id,
      organizationId: input.organizationId,
      title: input.title,
      aspectRatio: input.aspectRatio,
      targetDurationS: String(input.targetDurationSeconds ?? config.project.defaultTargetDurationSeconds),
      commandId: input.commandId,
      ...(input.idea ? { brief: { idea: input.idea } } : {}),
    })
    .onConflictDoNothing(); // unique (org, command_id) race safety
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.organizationId, input.organizationId), eq(project.commandId, input.commandId)));
  return row?.id ?? id;
}
