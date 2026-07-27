// REQ-STB-059 — music brief, generated track and transcript.

import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { asset } from "@avd/ast/schema";
import { enqueueGeneration } from "@avd/gen";
import { generation } from "@avd/gen/schema";
import { musicBrief } from "./schema";
import { StbValidationError, getProjectOrThrow, recipeFor, resolveCast } from "./common";
import { latestScript } from "./script";

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
