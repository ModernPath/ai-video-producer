// REQ-STB-001..004 + golden-thread frame/take requests (STB decides, GEN executes).
import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { archetypes, config } from "@avd/shared/config";
import { asset } from "@avd/ast/schema";
import { listProjectEntities, projectStylePrompt } from "@avd/ast";
import { enqueueGeneration } from "@avd/gen";
import { generation } from "@avd/gen/schema";
import { frameCandidate, musicBrief, scriptVersion, shot, shotPlanProposal, take } from "./schema";
import { normalizePlannedShots } from "./plan-normalize";
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

/** REQ-STB-016: per-shot ref selection wins; null falls back to the whole-cast default. */
function resolveShotRefs(shotRefAssetIds: string[] | null, castRefAssetIds: string[]): string[] {
  return shotRefAssetIds ?? castRefAssetIds;
}

/** Requests a start/end frame generation; materializes the candidate on completion event/return. */
export async function requestFrame(
  db: Db,
  input: { shotId: string; slot: "start" | "end"; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const s = await getShotOrThrow(db, input.shotId);
  const d = s.direction as DirectionJson;
  const cast = await resolveCast(db, s.projectId);
  const refAssetIds = resolveShotRefs(s.refAssetIds, cast.entityRefAssetIds); // REQ-STB-016
  const stylePrompt = await projectStylePrompt(db, s.projectId); // REQ-AST-007
  return enqueueGeneration(db, {
    organizationId: s.organizationId,
    projectId: s.projectId,
    principal: input.principal,
    kind: "frame",
    commandId: uuidv7(),
    target: { shotId: s.id, slot: input.slot },
    refs: refAssetIds.length ? { entityRefAssetIds: refAssetIds } : undefined,
    promptInput: {
      aspectRatio: input.aspectRatio,
      durationSeconds: Number(s.durationS),
      entities: cast.entities,
      stylePrompt: stylePrompt ?? undefined, // REQ-AST-007
      referenceImageCount: refAssetIds.length || undefined, // v3 preservation phrasing
      customPrompt: s.imagePrompt ?? undefined, // REQ-STB-013
      direction: {
        synopsis: d.synopsis, subject: d.subject, action: d.action,
        camera: d.camera, mood: d.mood, dialogue: d.dialogue, audioNotes: d.audioNotes,
      },
    },
  });
}

/** REQ-GEN-008 / BR-GEN-002: one gesture yields n start-frame candidates (default from config, clamped to max). */
export async function requestFrameBatch(
  db: Db,
  input: Parameters<typeof requestFrame>[1] & { count?: number }
): Promise<string[]> {
  const n = Math.max(1, Math.min(input.count ?? config.frame.candidatesDefault, config.frame.candidatesMax));
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(await requestFrame(db, input));
  return ids;
}

export async function requestTake(
  db: Db,
  input: { shotId: string; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const s = await getShotOrThrow(db, input.shotId);
  const d = s.direction as DirectionJson;
  // REQ-GEN-009: attach the selected start frame for image conditioning (BR-STB-002).
  const cast = await resolveCast(db, s.projectId);
  const refAssetIds = resolveShotRefs(s.refAssetIds, cast.entityRefAssetIds); // REQ-STB-016
  let refs: { startFrameAssetId?: string; entityRefAssetIds?: string[] } | undefined;
  if (s.selectedStartFrameId) {
    const [fc] = await db.select().from(frameCandidate).where(eq(frameCandidate.id, s.selectedStartFrameId));
    if (fc) refs = { startFrameAssetId: fc.imageAssetId };
  }
  if (refAssetIds.length) refs = { ...(refs ?? {}), entityRefAssetIds: refAssetIds };
  const stylePrompt = await projectStylePrompt(db, s.projectId); // REQ-AST-007
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
      stylePrompt: stylePrompt ?? undefined, // REQ-AST-007
      customPrompt: s.videoPrompt ?? undefined, // REQ-STB-013
      direction: {
        synopsis: d.synopsis, subject: d.subject, action: d.action,
        camera: d.camera, mood: d.mood, dialogue: d.dialogue, audioNotes: d.audioNotes,
      },
    },
  });
}

/** REQ-ANM-001: a free Remotion animation take (title template) for this shot. */
export async function requestAnimationTake(
  db: Db,
  input: { shotId: string; text: string; subtext?: string; template?: "title" | "kinetic"; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const s = await getShotOrThrow(db, input.shotId);
  if (!input.text.trim()) throw new StbValidationError("validation_failed", "Animation needs the title text");
  const planSubtext = (s.animation as { subtext?: string } | null)?.subtext; // REQ-STB-024 deferred item
  return enqueueGeneration(db, {
    organizationId: s.organizationId,
    projectId: s.projectId,
    principal: input.principal,
    kind: "animation",
    commandId: uuidv7(),
    target: { shotId: s.id },
    promptInput: {
      aspectRatio: input.aspectRatio,
      durationSeconds: Number(s.durationS),
      entities: [],
      customPrompt: input.text.trim(),
      direction: { synopsis: input.text.trim(), subject: "title card", action: "animated text" },
    },
  });
}

/** REQ-ANM-002: composite a transparent Remotion overlay onto an existing take (free, local). */
export async function requestAnimationOverlay(
  db: Db,
  input: { takeId: string; text: string; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const [t] = await db.select().from(take).where(and(eq(take.id, input.takeId), isNull(take.deletedAt)));
  if (!t) throw new StbValidationError("not_found", "Take not found");
  if (!input.text.trim()) throw new StbValidationError("validation_failed", "Overlay needs text");
  const s = await getShotOrThrow(db, t.shotId);
  return enqueueGeneration(db, {
    organizationId: s.organizationId,
    projectId: s.projectId,
    principal: input.principal,
    kind: "animation",
    commandId: uuidv7(),
    target: { shotId: s.id, retakeOfTakeId: t.id }, // overlay result is lineage-linked to its source
    refs: { editSourceAssetId: t.videoAssetId },
    promptInput: {
      aspectRatio: input.aspectRatio,
      durationSeconds: Number(t.durationActualS ?? s.durationS),
      entities: [],
      template: "lower-third",
      customPrompt: input.text.trim(),
      direction: { synopsis: input.text.trim(), subject: "overlay", action: "lower-third" },
    },
  });
}

/** REQ-STB-020 / SCN-STB-021: retake with instruction — same shot, same conditioning frame as the
 * source take (not the current selection), instruction appended to the video prompt; retake_of lineage. */
export async function requestRetake(
  db: Db,
  input: { takeId: string; instruction: string; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const [t] = await db.select().from(take).where(and(eq(take.id, input.takeId), isNull(take.deletedAt)));
  if (!t) throw new StbValidationError("not_found", "Take not found");
  if (!input.instruction.trim()) throw new StbValidationError("validation_failed", "Retake needs an instruction");
  const s = await getShotOrThrow(db, t.shotId);
  const d = s.direction as DirectionJson;
  const cast = await resolveCast(db, s.projectId);
  const refAssetIds = resolveShotRefs(s.refAssetIds, cast.entityRefAssetIds);
  const prov = await takeProvenance(db, t.id); // condition on what the source take used
  const stylePrompt = await projectStylePrompt(db, s.projectId);
  let refs: { startFrameAssetId?: string; entityRefAssetIds?: string[] } | undefined;
  if (prov.startFrameAssetId) refs = { startFrameAssetId: prov.startFrameAssetId };
  if (refAssetIds.length) refs = { ...(refs ?? {}), entityRefAssetIds: refAssetIds };
  const baseScript = s.videoPrompt?.trim();
  const customPrompt = baseScript
    ? `${baseScript}\nRetake adjustment: ${input.instruction.trim()}. Keep everything else the same.`
    : undefined;
  return enqueueGeneration(db, {
    organizationId: s.organizationId,
    projectId: s.projectId,
    principal: input.principal,
    kind: "retake",
    commandId: uuidv7(),
    target: { shotId: s.id, retakeOfTakeId: t.id },
    refs,
    promptInput: {
      aspectRatio: input.aspectRatio,
      durationSeconds: Number(s.durationS),
      entities: cast.entities,
      stylePrompt: stylePrompt ?? undefined,
      customPrompt: customPrompt ?? undefined, // custom script + adjustment, verbatim rule intact
      direction: {
        synopsis: d.synopsis, subject: d.subject, action: d.action,
        camera: d.camera,
        // auto path: the adjustment rides in the mood clause; ignored when customPrompt is set
        mood: `${d.mood ? d.mood + ". " : ""}Retake adjustment: ${input.instruction.trim()}. Keep everything else the same`,
        dialogue: d.dialogue, audioNotes: d.audioNotes,
      },
    },
  });
}

// ---- Script studio (REQ-STB-008 / REQ-STB-011) ----

function recipeFor(p: { archetype?: string | null }) {
  const r = p.archetype ? archetypes[p.archetype] : undefined; // REQ-STB-026
  return r ? { directing: r.directing, planBias: r.planBias, musicBias: r.musicBias } : {};
}

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
      ...recipeFor(p),
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
      ...recipeFor(p),
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
      ...recipeFor(p),
    },
  });
}

export async function getMusicBrief(db: Db, projectId: string) {
  const [b] = await db.select().from(musicBrief).where(eq(musicBrief.projectId, projectId));
  return b ?? null;
}

/** REQ-GEN-019: run the brief (incl. lyrics) through the music model; track attaches on materialize. */
export async function requestMusicTrack(db: Db, input: { projectId: string; principal: string }) {
  const p = await getProjectOrThrow(db, input.projectId);
  const brief = await getMusicBrief(db, input.projectId);
  if (!brief?.prompt) throw new StbValidationError("not_found", "No music brief yet — generate one first");
  return enqueueGeneration(db, {
    organizationId: p.organizationId,
    projectId: p.id,
    principal: input.principal,
    kind: "music",
    commandId: uuidv7(),
    target: { projectId: p.id },
    textInput: {
      projectTitle: p.title,
      brief: {},
      targetDurationSeconds: Number(p.targetDurationS),
      scriptText: brief.prompt, // the brief IS the model-ready prompt (verbatim)
    },
  });
}

/** REQ-GEN-020: transcribe the attached track into MM:SS-timestamped lines (drives lyric-synced cuts). */
export async function requestTranscript(db: Db, input: { projectId: string; principal: string }) {
  const p = await getProjectOrThrow(db, input.projectId);
  const brief = await getMusicBrief(db, input.projectId);
  if (!brief?.activeTrackAssetId) throw new StbValidationError("not_found", "No track attached — attach or generate one first");
  return enqueueGeneration(db, {
    organizationId: p.organizationId,
    projectId: p.id,
    principal: input.principal,
    kind: "transcript",
    commandId: uuidv7(),
    target: { projectId: p.id },
    refs: { audioAssetId: brief.activeTrackAssetId },
    textInput: {
      projectTitle: p.title,
      brief: {},
      targetDurationSeconds: Number(p.targetDurationS),
      scriptText: "Transcribe this song precisely. For every lyric line (or musical section if instrumental) output one line formatted as [MM:SS] text — timestamps in MM:SS from the start. Label song sections like [Verse]/[Chorus]/[Bridge] where identifiable. If multiple voices, note the speaker. Output only the timestamped lines.",
    },
  });
}

/** Test seam: set a brief without a generation round-trip. */
export async function upsertMusicBriefForTest(db: Db, input: { projectId: string; prompt: string }) {
  const existing = await getMusicBrief(db, input.projectId);
  if (existing) {
    await db.update(musicBrief).set({ prompt: input.prompt }).where(eq(musicBrief.projectId, input.projectId));
  } else {
    await db.insert(musicBrief).values({ id: uuidv7(), projectId: input.projectId, prompt: input.prompt });
  }
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
  const createdShotIds: string[] = [];
  for (const s of shots) {
    const shotId = await createShot(db, {
      organizationId: p!.organizationId,
      projectId: proposal.projectId,
      title: s.title,
      direction: s.direction,
      durationS: s.durationS, // INV-STB-001 enforced by createShot
    });
    if (s.imagePrompt || s.videoPrompt) {
      await updateShotScripts(db, { shotId, imagePrompt: s.imagePrompt ?? null, videoPrompt: s.videoPrompt ?? null }); // REQ-STB-014
    }
    if (s.animation) {
      await db.update(shot).set({ animation: s.animation }).where(eq(shot.id, shotId)); // REQ-STB-024
    }
    createdShotIds.push(shotId);
  }
  await db.update(shotPlanProposal).set({ status: "applied" }).where(eq(shotPlanProposal.id, input.proposalId));
  return createdShotIds;
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
  if (g.kind === "transcript") {
    const out = g.output as { text?: string } | null;
    if (!out?.text) return null;
    await db.update(musicBrief).set({ transcript: out.text }).where(eq(musicBrief.projectId, g.projectId)); // REQ-GEN-020
    return { kind: "transcript" as const, id: g.projectId };
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
    const normalized = normalizePlannedShots(g.output); // USER BUG: real-model shapes vary
    if (!normalized.length) return null;
    const out = { shots: normalized };
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

  if (g.kind === "music") {
    // project-scoped media (no shot target)
    const assetId = g.outputAssetIds[0]!;
    await attachMusicTrack(db, { projectId: g.projectId, assetId }); // REQ-GEN-019
    return { kind: "music" as const, id: assetId };
  }

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
  if (g.kind === "take" || g.kind === "retake" || g.kind === "animation") { // animation lands as a take (REQ-ANM-001)
    const id = uuidv7();
    const params = g.params as { durationSeconds?: number };
    await db.insert(take).values({
      id,
      shotId: target.shotId,
      videoAssetId: g.outputAssetIds[0]!,
      generationId: g.id,
      retakeOf: (target as { retakeOfTakeId?: string }).retakeOfTakeId ?? null, // REQ-STB-020 lineage
      durationActualS: params.durationSeconds != null ? String(params.durationSeconds) : null,
    });
    return { kind: "take" as const, id };
  }
  return null;
}

/** INV-STB-006: a take's conditioning provenance — which start frame (if any) it was generated from. */
export async function takeProvenance(db: Db, takeId: string): Promise<{ startFrameAssetId: string | null }> {
  const [t] = await db.select().from(take).where(eq(take.id, takeId));
  if (!t) throw new StbValidationError("not_found", "Take not found");
  const [g] = await db.select().from(generation).where(eq(generation.id, t.generationId));
  const snap = g?.promptSnapshot as { refs?: { startFrameAssetId?: string } } | undefined;
  return { startFrameAssetId: snap?.refs?.startFrameAssetId ?? null };
}

export async function selectFrame(db: Db, input: { shotId: string; frameCandidateId: string }) {
  const [fc] = await db.select().from(frameCandidate).where(eq(frameCandidate.id, input.frameCandidateId));
  if (!fc || fc.shotId !== input.shotId) throw new StbValidationError("not_found", "Frame candidate not found");
  const column = fc.slot === "start" ? { selectedStartFrameId: fc.id } : { selectedEndFrameId: fc.id };
  await db.update(shot).set(column).where(eq(shot.id, input.shotId)); // INV-STB-003: single column = single selection
}

export async function selectTake(db: Db, input: { shotId: string; takeId: string }) {
  const [t] = await db.select().from(take).where(eq(take.id, input.takeId));
  if (!t || t.shotId !== input.shotId) throw new StbValidationError("not_found", "Take not found"); // INV-STB-005
  const [a] = await db.select().from(asset).where(eq(asset.id, t.videoAssetId));
  if (a?.status !== "ready") throw new StbValidationError("asset_not_ready", "Take video is not ready yet"); // INV-STB-004
  await db.update(shot).set({ selectedTakeId: t.id }).where(eq(shot.id, input.shotId)); // INV-STB-003
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

export async function removeTake(db: Db, input: { takeId: string }): Promise<void> {
  const [t] = await db.select().from(take).where(eq(take.id, input.takeId));
  if (!t || t.deletedAt) throw new StbValidationError("not_found", "Take not found");
  const [s] = await db.select().from(shot).where(eq(shot.id, t.shotId));
  if (s?.selectedTakeId === t.id) {
    throw new StbValidationError("conflict", "This take is selected — select another before removing");
  }
  await db.update(take).set({ deletedAt: new Date() }).where(eq(take.id, t.id));
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
