// REQ-STB-059 — entity portraits, and casting an entity from one.

import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { type EntityKind } from "@avd/shared/config";
import { toPortraitStyle, toScenePlateStyle } from "@avd/shared/contracts";
import { listProjectEntities } from "@avd/ast";
import { enqueueGeneration } from "@avd/gen";
import { generation } from "@avd/gen/schema";
import { shot } from "./schema";
import { project } from "@avd/prj/schema";
import { StbValidationError, projectCard } from "./common";

// ---- Casting (REQ-STB-048, USER 2026-07-27) ----

/**
 * A plain reference portrait for someone the plan asked to cast.
 *
 * Deliberately scene-free: this image becomes the reference EVERY later shot of that character is
 * conditioned on, so baking in this shot's diner booth or hallway lighting would drag one scene
 * into all of them. Appearance only, neutral background.
 */
export async function requestEntityPortrait(
  db: Db,
  input: { projectId: string; appearance: string; principal: string; aspectRatio: "16:9" | "9:16"; kind?: EntityKind }
) {
  const [p] = await db.select().from(project).where(eq(project.id, input.projectId));
  if (!p) throw new StbValidationError("not_found", "Project not found");
  const appearance = input.appearance.trim();
  if (!appearance) throw new StbValidationError("validation_failed", "A portrait needs an appearance to draw");
  const card = await projectCard(db, input.projectId); // the film's own look, so casting matches it
  // NOT the card object: `toVisualStyle` would add typography and the main character's continuity,
  // which is how the first portrait came back captioned "THE WORKER" in someone else's jacket.
  // REQ-STB-053: a LOCATION gets an empty establishing plate, not a head-and-shoulders portrait.
  const isPlace = input.kind === "location";
  const look = card ? (isPlace ? toScenePlateStyle(card) : toPortraitStyle(card)) : "";
  return enqueueGeneration(db, {
    organizationId: p.organizationId,
    projectId: p.id,
    principal: input.principal,
    kind: "frame",
    commandId: uuidv7(),
    target: { casting: true },
    promptInput: {
      aspectRatio: input.aspectRatio,
      durationSeconds: 0,
      entities: [],
      customPrompt: isPlace
        ? `Reference plate of a location. ${appearance}. Wide establishing view of the empty space showing its architecture, furniture and light sources.${look ? ` ${look}` : ""}`
        : `Reference portrait. ${appearance}. Single person, facing camera, neutral expression, plain uncluttered background, even lighting, full head and shoulders visible.${look ? ` ${look}` : ""}`,
      direction: isPlace
        ? { synopsis: appearance, subject: "location plate", action: "empty space" }
        : { synopsis: appearance, subject: "reference portrait", action: "stands facing camera" },
    },
  });
}

/**
 * Turn a finished portrait into a cast member on this project.
 *
 * INV-AST-004 requires 1–5 refs for an entity to exist, so the portrait must come first — which is
 * also the only order that means anything: an entity with no reference images contributes nothing
 * to consistency, and consistency is the entire point of casting.
 */
export async function castFromPortrait(
  db: Db,
  input: { projectId: string; generationId: string; name: string; kind: EntityKind; description: string }
): Promise<string> {
  const [g] = await db.select().from(generation).where(eq(generation.id, input.generationId));
  const assetId = g?.outputAssetIds?.[0];
  if (!g || !assetId) throw new StbValidationError("not_found", "That portrait produced no image yet");
  const [p] = await db.select().from(project).where(eq(project.id, input.projectId));
  if (!p) throw new StbValidationError("not_found", "Project not found");

  const { createEntity, attachEntities, listProjectEntities } = await import("@avd/ast");
  const entityId = await createEntity(db, {
    organizationId: p.organizationId,
    kind: input.kind,
    name: input.name.trim(),
    description: input.description.trim() || input.name.trim(),
    refAssetIds: [assetId],
  });
  // attachEntities replaces the set, so carry the existing cast across.
  const existing = (await listProjectEntities(db, input.projectId)).map((e) => e.id);
  await attachEntities(db, { projectId: input.projectId, entityIds: [...existing, entityId] });
  return entityId;
}
