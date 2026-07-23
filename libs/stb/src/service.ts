// REQ-STB-001..004 + golden-thread frame/take requests (STB decides, GEN executes).
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { asset } from "@avd/ast/schema";
import { enqueueGeneration } from "@avd/gen";
import { generation } from "@avd/gen/schema";
import { frameCandidate, shot, take } from "./schema";

export class StbValidationError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export interface DirectionJson {
  synopsis: string;
  subject: string;
  action: string;
  camera?: string;
  mood?: string;
  dialogue?: string;
  audioNotes?: string;
  entityIds?: string[];
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

/** Requests a start/end frame generation; materializes the candidate on completion event/return. */
export async function requestFrame(
  db: Db,
  input: { shotId: string; slot: "start" | "end"; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const s = await getShotOrThrow(db, input.shotId);
  const d = s.direction as DirectionJson;
  return enqueueGeneration(db, {
    organizationId: s.organizationId,
    projectId: s.projectId,
    principal: input.principal,
    kind: "frame",
    commandId: uuidv7(),
    target: { shotId: s.id, slot: input.slot },
    promptInput: {
      aspectRatio: input.aspectRatio,
      durationSeconds: Number(s.durationS),
      entities: [],
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
  return enqueueGeneration(db, {
    organizationId: s.organizationId,
    projectId: s.projectId,
    principal: input.principal,
    kind: "take",
    commandId: uuidv7(),
    target: { shotId: s.id },
    promptInput: {
      aspectRatio: input.aspectRatio,
      durationSeconds: Number(s.durationS),
      entities: [],
      direction: {
        synopsis: d.synopsis, subject: d.subject, action: d.action,
        camera: d.camera, mood: d.mood, dialogue: d.dialogue, audioNotes: d.audioNotes,
      },
    },
  });
}

/** STB consumer for gen.GenerationCompleted — materializes candidates (docs/41 choreography). */
export async function materializeGenerationOutput(db: Db, generationId: string) {
  const [g] = await db.select().from(generation).where(eq(generation.id, generationId));
  if (!g || g.status !== "succeeded" || !g.outputAssetIds?.length) return null;
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
