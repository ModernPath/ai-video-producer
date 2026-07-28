// REQ-STB-059 — turning a completed generation into a frame candidate, take or script.

import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { generation } from "@avd/gen/schema";
import { frameCandidate, musicBrief, scriptVersion, shot, shotPlanProposal, take } from "./schema";
import { normalizePlannedShots } from "./plan-normalize";
import { normalizePlannedCast } from "./casting";
import { project } from "@avd/prj/schema";
import { attachMusicTrack } from "./music";
import { latestScript } from "./script";

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
    // REQ-STB-048: keep the cast beside the shots. `changes` used to be a bare array, which threw
    // the cast away before any UI could offer to cast it. Readers already accept both shapes, so
    // proposals stored before this stay readable.
    const out = { shots: normalized, cast: normalizePlannedCast(g.output) };
    const target = g.target as { scriptVersionId?: string };
    const id = uuidv7();
    await db.insert(shotPlanProposal).values({
      id,
      projectId: g.projectId,
      scriptVersionId: target.scriptVersionId ?? null,
      changes: out,
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
    // REQ-STB-034 (USER: "why can't I export"): a take landing on a shot with NO selection
    // auto-selects — one candidate means no creative choice yet, and unselected takes silently
    // zero the export. An existing selection is never overridden (INV-STB-003 stays user-owned).
    const [sh] = await db.select().from(shot).where(eq(shot.id, target.shotId));
    if (sh && !sh.selectedTakeId) {
      await db.update(shot).set({ selectedTakeId: id }).where(eq(shot.id, target.shotId));
      // REQ-STB-067: and hand its last frame on, exactly as `selectTake` does (REQ-STB-054).
      // This path used to update the row directly and stop there, so a take that auto-selected
      // never fed the shot continuing from it. Invisible in inline mode — the action selected the
      // take itself, through `selectTake`, which does hand off — and broken in queue mode, where
      // the WORKER materializes and nothing else ever touches the selection.
      const { handoffTailFrame } = await import("./continuity");
      await handoffTailFrame(db, { shotId: target.shotId }).catch(() => []);
    }
    return { kind: "take" as const, id };
  }
  return null;
}
