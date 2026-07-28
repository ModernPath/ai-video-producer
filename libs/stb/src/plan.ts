// REQ-STB-059 — the shot plan: propose a draft, then apply it to real shots.

import { and, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { listProjectEntities } from "@avd/ast";
import { enqueueGeneration } from "@avd/gen";
import { shot, shotPlanProposal, take } from "./schema";
import { normalizePlannedShots } from "./plan-normalize";
import { resolveShotCast } from "./casting";
import { project } from "@avd/prj/schema";
import { StbValidationError, getProjectOrThrow, recipeFor, resolveCast } from "./common";
import type { DirectionJson } from "./common";
import { setShotContinuity } from "./continuity";
import { getMusicBrief } from "./music";
import { latestScript } from "./script";
import { createShot, listShots, removeShot, updateShotScripts } from "./shots";
import { cardFor, isMusicLed, musicLedPlanBlocker } from "./music-led"; // REQ-STB-032

export async function proposeShotPlan(db: Db, input: { projectId: string; principal: string }) {
  const briefRow = await getMusicBrief(db, input.projectId); // REQ-STB-028: music-led planning
  const p = await getProjectOrThrow(db, input.projectId);
  const script = await latestScript(db, input.projectId);
  if (!script) throw new StbValidationError("no_script", "Draft a script before proposing a shot plan");
  const cast = await resolveCast(db, input.projectId); // REQ-STB-012

  // REQ-STB-032 / ADR-013 — a music-led film is cut to its song, so it plans against the REAL
  // track, not before it. Refused here rather than in the UI: REQ-STB-062 is the standing lesson
  // that a hidden control is guidance and the service is the guarantee. Costs nothing to check.
  const blocked = musicLedPlanBlocker({
    isMusicLed: isMusicLed(cardFor(p)),
    hasTrack: Boolean(briefRow?.activeTrackAssetId),
    hasTranscript: Boolean(briefRow?.transcript?.trim()),
  });
  if (blocked) throw new StbValidationError("music_track_required", blocked);

  return enqueueGeneration(db, {
    organizationId: p.organizationId,
    projectId: p.id,
    principal: input.principal,
    kind: "shot_plan",
    commandId: uuidv7(),
    target: { projectId: p.id, scriptVersionId: script.id },
    textInput: {
      projectTitle: p.title,
      brief: (p.brief ?? {}) as Record<string, unknown>,
      targetDurationSeconds: Number(p.targetDurationS),
      scriptText: script.content,
      entities: cast.entities,
      transcript: briefRow?.transcript ?? undefined, // REQ-STB-028
      ...recipeFor(p),
    },
  });
}

export interface PlannedShot {
  title: string;
  durationS: number;
  direction: DirectionJson;
  imagePrompt?: string | undefined; // REQ-STB-014: plan-authored scripts
  videoPrompt?: string | undefined;
}

/**
 * MVP: additive apply. Update/remove arms with paid-work protection land with REQ-STB-007.
 * Returns created shot ids in proposal order (REQ-STB-017: one-gesture first frames).
 */
export async function applyShotPlan(db: Db, input: { proposalId: string; principal: string }): Promise<string[]> {
  const [proposal] = await db.select().from(shotPlanProposal).where(eq(shotPlanProposal.id, input.proposalId));
  if (!proposal) throw new StbValidationError("not_found", "Proposal not found");
  if (proposal.status !== "proposed") throw new StbValidationError("conflict", "Proposal already resolved");
  const [p] = await db.select().from(project).where(eq(project.id, proposal.projectId));
  const shots = normalizePlannedShots(proposal.changes); // old rows may hold raw model shapes
  // REQ-STB-007 / INV-STB-007: a new plan replaces shots that carry no takes; shots with
  // takes (paid work) are preserved untouched — never silently destroyed.
  const existing = await listShots(db, proposal.projectId);
  for (const ex of existing) {
    const [anyTake] = await db.select().from(take).where(and(eq(take.shotId, ex.id), isNull(take.deletedAt))).limit(1);
    if (!anyTake) await removeShot(db, { shotId: ex.id });
  }
  // REQ-STB-049: attach each shot ONLY to the cast it names. Falling back to the whole cast put
  // the company logo into every shot, including close-ups of a face in a tram.
  const projectCast = await listProjectEntities(db, proposal.projectId);
  const createdShotIds: string[] = [];
  for (const s of shots) {
    const shotCast = resolveShotCast(s.cast, projectCast.map((e) => ({ id: e.id, name: e.name, refAssetIds: e.refAssetIds })));
    const shotId = await createShot(db, {
      organizationId: p!.organizationId,
      projectId: proposal.projectId,
      title: s.title,
      direction: { ...s.direction, ...(shotCast ? { entityIds: shotCast.entityIds } : {}) },
      durationS: s.durationS, // INV-STB-001 enforced by createShot
    });
    if (shotCast) {
      await db.update(shot).set({ refAssetIds: shotCast.refAssetIds }).where(eq(shot.id, shotId)); // REQ-STB-016/049
    }
    if (s.imagePrompt || s.videoPrompt) {
      await updateShotScripts(db, { shotId, imagePrompt: s.imagePrompt ?? null, videoPrompt: s.videoPrompt ?? null }); // REQ-STB-014
    }
    if (s.animation) {
      await db.update(shot).set({ animation: s.animation }).where(eq(shot.id, shotId)); // REQ-STB-024
    }
    // REQ-STB-054: link the chain as we build it — the previous shot is the one just created.
    if (s.continuesPrevious && createdShotIds.length) {
      await setShotContinuity(db, { shotId, continuesFromShotId: createdShotIds[createdShotIds.length - 1]! });
    }
    createdShotIds.push(shotId);
  }
  await db.update(shotPlanProposal).set({ status: "applied" }).where(eq(shotPlanProposal.id, input.proposalId));
  return createdShotIds;
}
