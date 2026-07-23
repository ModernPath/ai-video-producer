// REQ-PRJ-002 — idempotent project creation (docs/07 §3 command envelope).
// REQ-PRJ-003 — archive lifecycle (BR-PRJ-003) · REQ-PRJ-004 — cost meter (INV-PRJ-004).
import { and, eq, sql } from "drizzle-orm";
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

// REQ-PRJ-003 / BR-PRJ-003 — archiving hides the project and blocks new generations;
// rows and assets remain readable (no deletes here, ever).
export async function archiveProject(db: Db, input: { projectId: string }): Promise<void> {
  await db.update(project).set({ status: "archived" }).where(eq(project.id, input.projectId));
}

export async function unarchiveProject(db: Db, input: { projectId: string }): Promise<void> {
  await db.update(project).set({ status: "active" }).where(eq(project.id, input.projectId));
}

/** PRJ-owned status read used by GEN's enqueue guard (BR-PRJ-003) — keeps prj.project reads inside PRJ. */
export async function getProjectStatus(db: Db, projectId: string): Promise<"active" | "archived" | null> {
  const [row] = await db.select({ status: project.status }).from(project).where(eq(project.id, projectId));
  return row?.status ?? null;
}

// REQ-PRJ-004 / INV-PRJ-004 — cost meter = sum of succeeded+running generation costs for the
// project. Cross-context sync read model over GEN rows (docs/02 §5; same precedent as activity.ts —
// GEN remains single writer, PRJ only aggregates).
export async function costMeterUsd(db: Db, projectId: string): Promise<number> {
  const [row] = await db.execute<{ cost: string }>(sql`
    SELECT coalesce(sum(cost_usd), 0)::text AS cost
    FROM gen.generation
    WHERE project_id = ${projectId} AND status IN ('succeeded', 'running')
  `); // INV-PRJ-004
  return Number(row?.cost ?? 0);
}

/** REQ-AST-007: select the org style kit this project uses (null = none). PRJ single-writer of project. */
export async function setProjectStyleKit(db: Db, input: { projectId: string; styleKitId: string | null }): Promise<void> {
  await db.update(project).set({ styleKitId: input.styleKitId }).where(eq(project.id, input.projectId));
}
