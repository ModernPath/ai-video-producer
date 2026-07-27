// REQ-STB-059 — takes: video, animation, overlays, retakes, selection and provenance.

import { and, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { type FullFrameAnimationTemplate } from "@avd/shared/config";
import { asset } from "@avd/ast/schema";
import { projectStylePrompt } from "@avd/ast";
import { enqueueGeneration } from "@avd/gen";
import { generation } from "@avd/gen/schema";
import { frameCandidate, shot, take } from "./schema";
import { StbValidationError, getShotOrThrow, projectCard, resolveCast, resolveShotRefs } from "./common";
import type { DirectionJson } from "./common";
import { handoffTailFrame } from "./continuity";
import { listShots } from "./shots";

export async function requestTake(
  db: Db,
  input: { shotId: string; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const s = await getShotOrThrow(db, input.shotId);
  const d = s.direction as DirectionJson;
  // REQ-STB-055: a chained shot generated before its source has no last frame to start from — the
  // take is bought and the chain is silently defeated. Refuse HERE, where the cost is incurred; a
  // disabled button is guidance, this is the guarantee.
  if (s.continuesFromShotId) {
    const { generationBlocker } = await import("./chain");
    const siblings = await listShots(db, s.projectId);
    const blocked = generationBlocker(
      siblings.map((x) => ({ id: x.id, title: x.title, position: x.position, continuesFromShotId: x.continuesFromShotId, selectedTakeId: x.selectedTakeId })),
      s.id
    );
    if (blocked) throw new StbValidationError("validation_failed", blocked);
  }

  // REQ-GEN-009: attach the selected start frame for image conditioning (BR-STB-002).
  const cast = await resolveCast(db, s.projectId, d.entityIds); // REQ-STB-049
  const refAssetIds = resolveShotRefs(s.refAssetIds, cast.entityRefAssetIds); // REQ-STB-016
  let refs: { startFrameAssetId?: string; entityRefAssetIds?: string[] } | undefined;
  if (s.selectedStartFrameId) {
    const [fc] = await db.select().from(frameCandidate).where(eq(frameCandidate.id, s.selectedStartFrameId));
    if (fc) refs = { startFrameAssetId: fc.imageAssetId };
  }
  if (refAssetIds.length) refs = { ...(refs ?? {}), entityRefAssetIds: refAssetIds };
  const stylePrompt = await projectStylePrompt(db, s.projectId); // REQ-AST-007
  const card = await projectCard(db, s.projectId); // REQ-STB-044
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
      ...(card ? { card } : {}), // REQ-STB-044: the film's look reaches every picture
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
  input: { shotId: string; text: string; subtext?: string; highlightWord?: string; template?: FullFrameAnimationTemplate; accent?: string; background?: string; principal: string; aspectRatio: "16:9" | "9:16" }
) {
  const s = await getShotOrThrow(db, input.shotId);
  if (!input.text.trim()) throw new StbValidationError("validation_failed", "Animation needs the title text");
  const planAnim = s.animation as { subtext?: string; accent?: string; background?: string } | null;
  const planSubtext = planAnim?.subtext; // REQ-STB-024 deferred item
  // REQ-ANM-005: explicit input wins; otherwise the plan's authored palette flows through
  // SR-DIR-007: user > plan > the film's own palette. Before, a graphic with no plan colour fell
  // back to the renderer's warm default and read as bolted on next to the footage.
  const animCard = await projectCard(db, s.projectId);
  const accent = input.accent ?? planAnim?.accent ?? animCard?.palette.accent;
  const background = input.background ?? planAnim?.background ?? animCard?.palette.background;
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
      template: input.template ?? "title", // REQ-ANM-004 (eval fix: was silently dropped)
      // REQ-STB-036: subtext feeds quote attributions / checklist items / stat sublines
      ...((input.subtext ?? planSubtext) ? { subtext: (input.subtext ?? planSubtext)!.trim() } : {}),
      ...(accent ? { accent } : {}), // REQ-ANM-005: palette reaches the renderer
      ...(background ? { background } : {}),
      highlightWord: input.highlightWord, // product-launch recipe: highlight the product word
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

/** INV-STB-006: a take's conditioning provenance — which start frame (if any) it was generated from. */
export async function takeProvenance(db: Db, takeId: string): Promise<{ startFrameAssetId: string | null }> {
  const [t] = await db.select().from(take).where(eq(take.id, takeId));
  if (!t) throw new StbValidationError("not_found", "Take not found");
  const [g] = await db.select().from(generation).where(eq(generation.id, t.generationId));
  const snap = g?.promptSnapshot as { refs?: { startFrameAssetId?: string } } | undefined;
  return { startFrameAssetId: snap?.refs?.startFrameAssetId ?? null };
}

export async function selectTake(db: Db, input: { shotId: string; takeId: string }) {
  const [t] = await db.select().from(take).where(eq(take.id, input.takeId));
  if (!t || t.shotId !== input.shotId) throw new StbValidationError("not_found", "Take not found"); // INV-STB-005
  const [a] = await db.select().from(asset).where(eq(asset.id, t.videoAssetId));
  if (a?.status !== "ready") throw new StbValidationError("asset_not_ready", "Take video is not ready yet"); // INV-STB-004
  await db.update(shot).set({ selectedTakeId: t.id }).where(eq(shot.id, input.shotId)); // INV-STB-003
  // REQ-STB-054: the moment this take becomes the chosen one, any shot continuing from it can take
  // its last frame as a start frame. Best-effort — a failed handoff must not undo the selection.
  await handoffTailFrame(db, { shotId: input.shotId }).catch(() => []);
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
