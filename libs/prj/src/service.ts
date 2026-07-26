// REQ-PRJ-002 — idempotent project creation (docs/07 §3 command envelope).
// REQ-PRJ-003 — archive lifecycle (BR-PRJ-003) · REQ-PRJ-004 — cost meter (INV-PRJ-004).
import { and, eq, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config, styleCards } from "@avd/shared/config";
import { styleCardSchema, type StyleCard } from "@avd/shared/contracts";
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

/** REQ-STB-026/027: select the directing archetype (docs/87); null = freeform. Applies recipe defaults. */
export async function setProjectArchetype(db: Db, input: { projectId: string; archetype: string | null }): Promise<void> {
  const recipe = input.archetype ? styleCards[input.archetype] : undefined; // TASK-DIR-004
  await db.update(project).set({
    archetype: input.archetype,
    // SR-DIR-008: exactly one style source — choosing a BUILT-IN replaces the compiled card, so
    // "what does this film look like?" never has two answers. Choosing freeform (null) leaves it
    // alone: the picker shows "freeform" whenever a compiled card is active, so treating that as
    // "delete my card" destroyed the user's work on one accidental Set (USER 2026-07-26).
    ...(input.archetype ? { styleCard: null } : {}),
    ...(recipe?.defaults?.audioMode ? { audioMixMode: recipe.defaults.audioMode } : {}), // REQ-STB-027
  }).where(eq(project.id, input.projectId));
}

/**
 * SR-DIR-008 (USER 2026-07-26 "how do I test my Kaurismäki shortfilm?") — store a Style Card
 * compiled from a free-form brief. Validated on the way in: a card that cannot be parsed must
 * never reach the prompt builders, which assume a valid contract.
 */
export async function setProjectStyleCard(db: Db, input: { projectId: string; card: StyleCard }): Promise<void> {
  const card = styleCardSchema.parse(input.card);
  await db.update(project).set({
    styleCard: card,
    archetype: null, // a compiled card is not one of the six seed keys
    ...(card.defaults?.audioMode ? { audioMixMode: card.defaults.audioMode } : {}), // REQ-STB-027
  }).where(eq(project.id, input.projectId));
}

/** REQ-PRJ-006: set the runtime the user asked for, clamped to what the product can build. */
export async function setProjectTargetDuration(db: Db, input: { projectId: string; targetDurationS: number }): Promise<void> {
  const { minTargetSeconds, maxTargetSeconds } = config.project;
  const s = Math.round(Math.min(Math.max(input.targetDurationS, minTargetSeconds), maxTargetSeconds));
  await db.update(project).set({ targetDurationS: String(s) }).where(eq(project.id, input.projectId));
}

/** The project's compiled card, or null when it uses a built-in archetype (or nothing). */
export async function getProjectStyleCard(db: Db, projectId: string): Promise<StyleCard | null> {
  const [p] = await db.select().from(project).where(eq(project.id, projectId));
  if (!p?.styleCard) return null;
  const parsed = styleCardSchema.safeParse(p.styleCard);
  return parsed.success ? parsed.data : null; // a card stored before a contract change is ignored, not fatal
}
