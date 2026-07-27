// REQ-STB-059 — the Shot aggregate: create, list, edit, reorder, and frame/take selection.

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { asset } from "@avd/ast/schema";
import { frameCandidate, shot, take } from "./schema";
import { StbValidationError, assertDuration, getShotOrThrow } from "./common";
import type { DirectionJson } from "./common";

export async function createShot(
  db: Db,
  input: {
    organizationId: string;
    projectId: string;
    title: string;
    direction: DirectionJson;
    durationS: number;
  }
): Promise<string> {
  assertDuration(input.durationS);
  const [row] = await db
    .select({ maxPos: max(shot.position) })
    .from(shot)
    .where(eq(shot.projectId, input.projectId)); // include soft-deleted rows: they still hold their position (unique constraint)
  const id = uuidv7();
  await db.insert(shot).values({
    id,
    organizationId: input.organizationId,
    projectId: input.projectId,
    position: (row?.maxPos ?? 0) + 1, // INV-STB-002: append at end
    title: input.title,
    direction: input.direction,
    durationS: String(input.durationS),
  });
  return id;
}

export async function listShots(db: Db, projectId: string) {
  return db
    .select()
    .from(shot)
    .where(and(eq(shot.projectId, projectId), isNull(shot.deletedAt)))
    .orderBy(asc(shot.position));
}

export async function selectFrame(db: Db, input: { shotId: string; frameCandidateId: string }) {
  const [fc] = await db.select().from(frameCandidate).where(eq(frameCandidate.id, input.frameCandidateId));
  if (!fc || fc.shotId !== input.shotId) throw new StbValidationError("not_found", "Frame candidate not found");
  const column = fc.slot === "start" ? { selectedStartFrameId: fc.id } : { selectedEndFrameId: fc.id };
  await db.update(shot).set(column).where(eq(shot.id, input.shotId)); // INV-STB-003: single column = single selection
}

// ---- Per-shot scripts (REQ-STB-013, USER feedback) ----

export async function updateShotScripts(
  db: Db,
  input: { shotId: string; imagePrompt?: string | null | undefined; videoPrompt?: string | null | undefined }
): Promise<void> {
  await getShotOrThrow(db, input.shotId);
  const patch: Record<string, string | null> = {};
  if (input.imagePrompt !== undefined) patch.imagePrompt = input.imagePrompt?.trim() || null;
  if (input.videoPrompt !== undefined) patch.videoPrompt = input.videoPrompt?.trim() || null;
  if (Object.keys(patch).length) await db.update(shot).set(patch).where(eq(shot.id, input.shotId));
}

/**
 * REQ-STB-046 (USER 2026-07-27) — set the words a character speaks in this shot.
 *
 * `direction` is one JSON column, so this merges rather than replaces: the planner's synopsis,
 * subject, action, camera and mood must survive an edit to the spoken line. Emptying it clears the
 * key entirely, which is what makes a shot silent again.
 */
export async function updateShotDialogue(db: Db, input: { shotId: string; dialogue: string }): Promise<void> {
  const s = await getShotOrThrow(db, input.shotId);
  const direction = { ...(s.direction as DirectionJson) };
  const line = input.dialogue.trim();
  if (line) direction.dialogue = line;
  else delete direction.dialogue;
  await db.update(shot).set({ direction }).where(eq(shot.id, input.shotId));
}

// ---- Per-shot reference images (REQ-STB-016) ----

/** Sets which reference images attach to this shot's generations; null clears back to the whole-cast default. */
export async function updateShotRefs(
  db: Db,
  input: { shotId: string; refAssetIds: string[] | null }
): Promise<void> {
  await getShotOrThrow(db, input.shotId);
  if (input.refAssetIds !== null && input.refAssetIds.length) {
    const rows = await db.select().from(asset).where(inArray(asset.id, input.refAssetIds));
    const byId = new Map(rows.map((a) => [a.id, a]));
    for (const id of input.refAssetIds) {
      const a = byId.get(id);
      if (!a || a.kind !== "image" || a.status !== "ready") {
        throw new StbValidationError("asset_not_ready", "Shot reference images must be ready image assets"); // REQ-STB-016
      }
    }
  }
  await db.update(shot).set({ refAssetIds: input.refAssetIds }).where(eq(shot.id, input.shotId));
}

// ---- Candidate removal (REQ-STB-009 / POL-STB-002/003) ----

export async function removeFrameCandidate(db: Db, input: { frameCandidateId: string }): Promise<void> {
  const [fc] = await db.select().from(frameCandidate).where(eq(frameCandidate.id, input.frameCandidateId));
  if (!fc || fc.deletedAt) throw new StbValidationError("not_found", "Frame candidate not found");
  const [s] = await db.select().from(shot).where(eq(shot.id, fc.shotId));
  if (s?.selectedStartFrameId === fc.id || s?.selectedEndFrameId === fc.id) {
    throw new StbValidationError("conflict", "This frame is selected — unselect it before removing");
  }
  await db.update(frameCandidate).set({ deletedAt: new Date() }).where(eq(frameCandidate.id, fc.id)); // soft; asset retained (INV-AST-003)
}

/** REQ-STB-022 / SCN-STB-010: swap a live shot with its live neighbor; edges no-op.
 * Position uniqueness (project_id, position) requires a three-step swap via a temp slot. */
export async function reorderShot(db: Db, input: { shotId: string; direction: "up" | "down" }): Promise<void> {
  const s = await getShotOrThrow(db, input.shotId);
  if (s.deletedAt) throw new StbValidationError("not_found", "Shot not found");
  const live = await listShots(db, s.projectId); // asc position, live only
  const idx = live.findIndex((x) => x.id === s.id);
  const swapIdx = input.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= live.length) return; // edge — no-op (INV-STB-002 stays contiguous enough)
  const other = live[swapIdx]!;
  const tempPos = -1; // positions are 1-based; -1 is never occupied
  await db.transaction(async (tx) => {
    await tx.update(shot).set({ position: tempPos }).where(eq(shot.id, s.id));
    await tx.update(shot).set({ position: s.position }).where(eq(shot.id, other.id));
    await tx.update(shot).set({ position: other.position }).where(eq(shot.id, s.id));
  });
}

/**
 * REQ-STB-038 — move a shot to an arbitrary index among the live shots (USER 2026-07-25 "how can I
 * actually change the order of the clips?"). Dragging a clip across the film is ONE command here,
 * where `reorderShot` would need N neighbour swaps. `toIndex` is 0-based against the list WITHOUT
 * the moving shot, and is clamped rather than rejected so a drag past either end still lands.
 * Positions are rewritten contiguously 1..n in one transaction (INV-STB-002).
 */
export async function moveShotToIndex(db: Db, input: { shotId: string; toIndex: number }): Promise<void> {
  const s = await getShotOrThrow(db, input.shotId);
  if (s.deletedAt) throw new StbValidationError("not_found", "Shot not found");
  const live = await listShots(db, s.projectId); // asc position, live only
  const without = live.filter((x) => x.id !== s.id);
  const target = Math.max(0, Math.min(input.toIndex, without.length));
  const ordered = [...without.slice(0, target), s, ...without.slice(target)];
  if (ordered.every((x, i) => x.id === live[i]!.id)) return; // already there
  // unique(project_id, position) spans soft-deleted rows too (they keep their slot — see
  // createShot), so reuse exactly the slots the live shots already occupy instead of 1..n.
  const slots = live.map((x) => x.position).sort((p, q) => p - q);
  await db.transaction(async (tx) => {
    // park out of the positive range first — writing slots directly would collide mid-rewrite
    for (const [i, x] of ordered.entries()) {
      await tx.update(shot).set({ position: -(i + 1) }).where(eq(shot.id, x.id));
    }
    for (const [i, x] of ordered.entries()) {
      await tx.update(shot).set({ position: slots[i]! }).where(eq(shot.id, x.id));
    }
  });
}

/** REQ-STB-025: duration edit (INV-STB-001 bounds) — used by music-sync apply. */
export async function updateShotDuration(db: Db, input: { shotId: string; durationS: number }): Promise<void> {
  assertDuration(input.durationS);
  await getShotOrThrow(db, input.shotId);
  await db.update(shot).set({ durationS: String(input.durationS) }).where(eq(shot.id, input.shotId));
}

export async function removeShot(db: Db, input: { shotId: string; confirmPaid?: boolean }): Promise<void> {
  const [s] = await db.select().from(shot).where(eq(shot.id, input.shotId));
  if (!s || s.deletedAt) throw new StbValidationError("not_found", "Shot not found");
  if (s.selectedTakeId && !input.confirmPaid) {
    // INV-STB-007: removals that discard paid takes need explicit confirmation
    throw new StbValidationError("conflict", "This shot has a selected take — confirm removal to discard it");
  }
  const now = new Date();
  await db.update(take).set({ deletedAt: now }).where(and(eq(take.shotId, s.id), isNull(take.deletedAt))); // media assets retained (INV-AST-003)
  await db.update(frameCandidate).set({ deletedAt: now }).where(and(eq(frameCandidate.shotId, s.id), isNull(frameCandidate.deletedAt)));
  await db.update(shot).set({ deletedAt: now }).where(eq(shot.id, s.id));
}

export async function listCandidates(db: Db, shotId: string) {
  const frames = await db
    .select()
    .from(frameCandidate)
    .where(and(eq(frameCandidate.shotId, shotId), isNull(frameCandidate.deletedAt)))
    .orderBy(asc(frameCandidate.createdAt));
  const takes = await db
    .select()
    .from(take)
    .where(and(eq(take.shotId, shotId), isNull(take.deletedAt)))
    .orderBy(asc(take.createdAt));
  return { frames, takes };
}
