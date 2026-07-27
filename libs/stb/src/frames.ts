// REQ-STB-059 — start/end frame requests. STB decides, GEN executes.

import { and, eq, max } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { projectStylePrompt } from "@avd/ast";
import { enqueueGeneration } from "@avd/gen";
import { generation } from "@avd/gen/schema";
import { shot, take } from "./schema";
import { StbValidationError, getShotOrThrow, projectCard, resolveCast, resolveShotRefs } from "./common";
import type { DirectionJson } from "./common";

/** Requests a start/end frame generation; materializes the candidate on completion event/return. */
export async function requestFrame(
  db: Db,
  input: { shotId: string; slot: "start" | "end"; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const s = await getShotOrThrow(db, input.shotId);
  // REQ-STB-062 (USER 2026-07-27: "are we still generating images for sub-scenes?") — a sub-clip's
  // first frame IS the previous take's last frame, so a bought frame is discarded by the handoff.
  // REQ-STB-057 hid the controls; "Apply + frames" is a different path and spent the money anyway.
  // The refusal belongs where the cost is, exactly as for takes (REQ-STB-055).
  if (s.continuesFromShotId) {
    const [src] = await db.select().from(shot).where(eq(shot.id, s.continuesFromShotId));
    throw new StbValidationError(
      "validation_failed",
      `${s.title} continues ${src?.title ?? "another shot"} — its start frame is that take's last frame, so generating one would be discarded. Break the chain first if you want to choose a frame.`
    );
  }
  const d = s.direction as DirectionJson;
  const cast = await resolveCast(db, s.projectId, d.entityIds); // REQ-STB-049
  const refAssetIds = resolveShotRefs(s.refAssetIds, cast.entityRefAssetIds); // REQ-STB-016
  const stylePrompt = await projectStylePrompt(db, s.projectId); // REQ-AST-007
  const card = await projectCard(db, s.projectId); // REQ-STB-044
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
      ...(card ? { card } : {}), // REQ-STB-044: the film's look reaches every picture
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
