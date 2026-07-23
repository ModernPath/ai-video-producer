// REQ-STB-001..004 + golden-thread frame/take requests (STB decides, GEN executes).
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { asset } from "@avd/ast/schema";
import { listProjectEntities } from "@avd/ast";
import { enqueueGeneration } from "@avd/gen";
import { generation } from "@avd/gen/schema";
import { frameCandidate, musicBrief, scriptVersion, shot, shotPlanProposal, take } from "./schema";
import { project } from "@avd/prj/schema";

export class StbValidationError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export interface DirectionJson {
  synopsis: string;
  subject: string;
  action: string;
  camera?: string | undefined;
  mood?: string | undefined;
  dialogue?: string | undefined;
  audioNotes?: string | undefined;
  entityIds?: string[] | undefined;
}

function assertDuration(durationS: number) {
  const { minSeconds, maxSeconds } = config.shot;
  if (Number.isNaN(durationS) || durationS < minSeconds || durationS > maxSeconds) {
    throw new StbValidationError(
      "validation_failed",
      `Shot duration must be between ${minSeconds} and ${maxSeconds} seconds` // INV-STB-001
    );
  }
}

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
    .where(and(eq(shot.projectId, input.projectId), isNull(shot.deletedAt)));
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

async function getShotOrThrow(db: Db, shotId: string) {
  const [s] = await db.select().from(shot).where(eq(shot.id, shotId));
  if (!s) throw new StbValidationError("not_found", "Shot not found");
  return s;
}

/** Resolves the project cast (REQ-AST-006 MVP: all attached entities apply to every shot). */
async function resolveCast(db: Db, projectId: string) {
  const cast = await listProjectEntities(db, projectId);
  return {
    entities: cast.map((e) => ({ kind: e.kind, name: e.name, description: e.description })),
    entityRefAssetIds: cast.flatMap((e) => e.refAssetIds),
  };
}

/** Requests a start/end frame generation; materializes the candidate on completion event/return. */
export async function requestFrame(
  db: Db,
  input: { shotId: string; slot: "start" | "end"; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const s = await getShotOrThrow(db, input.shotId);
  const d = s.direction as DirectionJson;
  const cast = await resolveCast(db, s.projectId);
  return enqueueGeneration(db, {
    organizationId: s.organizationId,
    projectId: s.projectId,
    principal: input.principal,
    kind: "frame",
    commandId: uuidv7(),
    target: { shotId: s.id, slot: input.slot },
    refs: cast.entityRefAssetIds.length ? { entityRefAssetIds: cast.entityRefAssetIds } : undefined,
    promptInput: {
      aspectRatio: input.aspectRatio,
      durationSeconds: Number(s.durationS),
      entities: cast.entities,
      direction: {
        synopsis: d.synopsis, subject: d.subject, action: d.action,
        camera: d.camera, mood: d.mood, dialogue: d.dialogue, audioNotes: d.audioNotes,
      },
    },
  });
}

export async function requestTake(
  db: Db,
  input: { shotId: string; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const s = await getShotOrThrow(db, input.shotId);
  const d = s.direction as DirectionJson;
  // REQ-GEN-009: attach the selected start frame for image conditioning (BR-STB-002).
  const cast = await resolveCast(db, s.projectId);
  let refs: { startFrameAssetId?: string; entityRefAssetIds?: string[] } | undefined;
  if (s.selectedStartFrameId) {
    const [fc] = await db.select().from(frameCandidate).where(eq(frameCandidate.id, s.selectedStartFrameId));
    if (fc) refs = { startFrameAssetId: fc.imageAssetId };
  }
  if (cast.entityRefAssetIds.length) refs = { ...(refs ?? {}), entityRefAssetIds: cast.entityRefAssetIds };
  return enqueueGeneration(db, {
    organizationId: s.organizationId,
    projectId: s.projectId,
    principal: input.principal,
    kind: "take",
    commandId: uuidv7(),
    target: { shotId: s.id },
    refs,
    promptInput: {
      aspectRatio: input.aspectRatio,
      durationSeconds: Number(s.durationS),
      entities: cast.entities,
      direction: {
        synopsis: d.synopsis, subject: d.subject, action: d.action,
        camera: d.camera, mood: d.mood, dialogue: d.dialogue, audioNotes: d.audioNotes,
      },
    },
  });
}

// ---- Script studio (REQ-STB-008 / REQ-STB-011) ----

async function getProjectOrThrow(db: Db, projectId: string) {
  const [p] = await db.select().from(project).where(eq(project.id, projectId));
  if (!p) throw new StbValidationError("not_found", "Project not found");
  return p;
}

export async function draftScript(db: Db, input: { projectId: string; principal: string; instruction?: string }) {
  const p = await getProjectOrThrow(db, input.projectId);
  const cast = await resolveCast(db, input.projectId); // REQ-STB-012
  return enqueueGeneration(db, {
    organizationId: p.organizationId,
    projectId: p.id,
    principal: input.principal,
    kind: "script",
    commandId: uuidv7(),
    target: { projectId: p.id },
    textInput: {
      projectTitle: p.title,
      brief: (p.brief ?? {}) as Record<string, unknown>,
      targetDurationSeconds: Number(p.targetDurationS),
      instruction: input.instruction,
      entities: cast.entities,
    },
  });
}

export async function latestScript(db: Db, projectId: string) {
  const versions = await db.select().from(scriptVersion).where(eq(scriptVersion.projectId, projectId));
  return versions.sort((a, b) => b.version - a.version)[0] ?? null;
}

export async function proposeShotPlan(db: Db, input: { projectId: string; principal: string }) {
  const p = await getProjectOrThrow(db, input.projectId);
  const script = await latestScript(db, input.projectId);
  if (!script) throw new StbValidationError("no_script", "Draft a script before proposing a shot plan");
  const cast = await resolveCast(db, input.projectId); // REQ-STB-012
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
    },
  });
}

// ---- Music brief (REQ-STB-010 / BR-STB-007 / docs/17 §1) ----

export async function requestMusicBrief(db: Db, input: { projectId: string; principal: string }) {
  const p = await getProjectOrThrow(db, input.projectId);
  const script = await latestScript(db, input.projectId);
  const cast = await resolveCast(db, input.projectId); // REQ-STB-012
  return enqueueGeneration(db, {
    organizationId: p.organizationId,
    projectId: p.id,
    principal: input.principal,
    kind: "music_brief",
    commandId: uuidv7(),
    target: { projectId: p.id },
    textInput: {
      projectTitle: p.title,
      brief: (p.brief ?? {}) as Record<string, unknown>,
      targetDurationSeconds: Number(p.targetDurationS),
      scriptText: script?.content,
      entities: cast.entities,
    },
  });
}

export async function getMusicBrief(db: Db, projectId: string) {
  const [b] = await db.select().from(musicBrief).where(eq(musicBrief.projectId, projectId));
  return b ?? null;
}

export async function attachMusicTrack(db: Db, input: { projectId: string; assetId: string }) {
  const [a] = await db.select().from(asset).where(eq(asset.id, input.assetId));
  if (a?.status !== "ready" || a.kind !== "audio") {
    throw new StbValidationError("asset_not_ready", "Music track must be a ready audio asset");
  }
  const [b] = await db.select().from(musicBrief).where(eq(musicBrief.projectId, input.projectId));
  if (!b) throw new StbValidationError("not_found", "Generate a music brief before attaching a track");
  await db.update(musicBrief).set({ activeTrackAssetId: input.assetId, updatedAt: new Date() }).where(eq(musicBrief.id, b.id));
}

export interface PlannedShot {
  title: string;
  durationS: number;
  direction: DirectionJson;
}

/** MVP: additive apply. Update/remove arms with paid-work protection land with REQ-STB-007. */
export async function applyShotPlan(db: Db, input: { proposalId: string; principal: string }) {
  const [proposal] = await db.select().from(shotPlanProposal).where(eq(shotPlanProposal.id, input.proposalId));
  if (!proposal) throw new StbValidationError("not_found", "Proposal not found");
  if (proposal.status !== "proposed") throw new StbValidationError("conflict", "Proposal already resolved");
  const [p] = await db.select().from(project).where(eq(project.id, proposal.projectId));
  const shots = proposal.changes as PlannedShot[];
  for (const s of shots) {
    await createShot(db, {
      organizationId: p!.organizationId,
      projectId: proposal.projectId,
      title: s.title,
      direction: s.direction,
      durationS: s.durationS, // INV-STB-001 enforced by createShot
    });
  }
  await db.update(shotPlanProposal).set({ status: "applied" }).where(eq(shotPlanProposal.id, input.proposalId));
}

/** STB consumer for gen.GenerationCompleted — materializes candidates (docs/41 choreography). */
export async function materializeGenerationOutput(db: Db, generationId: string) {
  const [g] = await db.select().from(generation).where(eq(generation.id, generationId));
  if (!g || g.status !== "succeeded") return null;

  // Text kinds → script version / plan proposal (REQ-STB-008/011)
  if (g.kind === "script") {
    const out = g.output as { text?: string } | null;
    if (!out?.text) return null;
    const latest = await latestScript(db, g.projectId);
    const id = uuidv7();
    await db.insert(scriptVersion).values({
      id,
      projectId: g.projectId,
      version: (latest?.version ?? 0) + 1,
      content: out.text,
      source: "drafted",
      generationId: g.id,
    });
    return { kind: "script" as const, id };
  }
  if (g.kind === "music_brief") {
    const out = g.output as { text?: string } | null;
    if (!out?.text) return null;
    const id = uuidv7();
    await db
      .insert(musicBrief)
      .values({ id, projectId: g.projectId, prompt: out.text, generationId: g.id })
      .onConflictDoUpdate({
        target: musicBrief.projectId,
        set: { prompt: out.text, generationId: g.id, updatedAt: new Date() }, // replace, keep single row
      });
    return { kind: "music_brief" as const, id };
  }
  if (g.kind === "shot_plan") {
    const out = g.output as { shots?: PlannedShot[] } | null;
    if (!out?.shots?.length) return null;
    const target = g.target as { scriptVersionId?: string };
    const id = uuidv7();
    await db.insert(shotPlanProposal).values({
      id,
      projectId: g.projectId,
      scriptVersionId: target.scriptVersionId ?? null,
      changes: out.shots,
      generationId: g.id,
    });
    return { kind: "shot_plan" as const, id };
  }

  if (!g.outputAssetIds?.length) return null;
  const target = g.target as { shotId?: string; slot?: "start" | "end" };
  if (!target.shotId) return null;

  if (g.kind === "frame" || g.kind === "image_edit") {
    const id = uuidv7();
    await db.insert(frameCandidate).values({
      id,
      shotId: target.shotId,
      slot: target.slot ?? "start",
      imageAssetId: g.outputAssetIds[0]!,
      generationId: g.id,
    });
    return { kind: "frame" as const, id };
  }
  if (g.kind === "take" || g.kind === "retake") {
    const id = uuidv7();
    const params = g.params as { durationSeconds?: number };
    await db.insert(take).values({
      id,
      shotId: target.shotId,
      videoAssetId: g.outputAssetIds[0]!,
      generationId: g.id,
      durationActualS: params.durationSeconds != null ? String(params.durationSeconds) : null,
    });
    return { kind: "take" as const, id };
  }
  return null;
}

export async function selectFrame(db: Db, input: { shotId: string; frameCandidateId: string }) {
  const [fc] = await db.select().from(frameCandidate).where(eq(frameCandidate.id, input.frameCandidateId));
  if (!fc || fc.shotId !== input.shotId) throw new StbValidationError("not_found", "Frame candidate not found");
  const column = fc.slot === "start" ? { selectedStartFrameId: fc.id } : { selectedEndFrameId: fc.id };
  await db.update(shot).set(column).where(eq(shot.id, input.shotId)); // INV-STB-003: single column = single selection
}

export async function selectTake(db: Db, input: { shotId: string; takeId: string }) {
  const [t] = await db.select().from(take).where(eq(take.id, input.takeId));
  if (!t || t.shotId !== input.shotId) throw new StbValidationError("not_found", "Take not found");
  const [a] = await db.select().from(asset).where(eq(asset.id, t.videoAssetId));
  if (a?.status !== "ready") throw new StbValidationError("asset_not_ready", "Take video is not ready yet"); // INV-STB-004
  await db.update(shot).set({ selectedTakeId: t.id }).where(eq(shot.id, input.shotId)); // INV-STB-003
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

export async function removeTake(db: Db, input: { takeId: string }): Promise<void> {
  const [t] = await db.select().from(take).where(eq(take.id, input.takeId));
  if (!t || t.deletedAt) throw new StbValidationError("not_found", "Take not found");
  const [s] = await db.select().from(shot).where(eq(shot.id, t.shotId));
  if (s?.selectedTakeId === t.id) {
    throw new StbValidationError("conflict", "This take is selected — select another before removing");
  }
  await db.update(take).set({ deletedAt: new Date() }).where(eq(take.id, t.id));
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
