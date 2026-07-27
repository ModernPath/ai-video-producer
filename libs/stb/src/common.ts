// REQ-STB-059 — helpers every STB aggregate needs.
//
// These were private to the 1,147-line service.ts. Each is used by 2–14 of its exports, so none
// belongs to a single aggregate; putting them here is what lets the aggregates stay independent
// instead of reaching into each other (acceptance criterion 3).
//
// Only StbValidationError and DirectionJson are public: service.ts re-exports exactly those two
// from this module and nothing else, so the rest stay internal to STB.

import { and, eq } from "drizzle-orm";
import type { Db } from "@avd/shared/db";
import { shotDurationPolicy, styleCards } from "@avd/shared/config";
import { styleCardSchema, toDirectingBlock, toMusicBias, toPlanBias } from "@avd/shared/contracts";
import { listProjectEntities } from "@avd/ast";
import { shot } from "./schema";
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

export function assertDuration(durationS: number) {
  const { minSeconds, maxSeconds } = shotDurationPolicy(); // REQ-STB-029: cap follows the video route
  if (Number.isNaN(durationS) || durationS < minSeconds || durationS > maxSeconds) {
    throw new StbValidationError(
      "validation_failed",
      `Shot duration must be between ${minSeconds} and ${maxSeconds} seconds` // INV-STB-001
    );
  }
}

export async function getShotOrThrow(db: Db, shotId: string) {
  const [s] = await db.select().from(shot).where(eq(shot.id, shotId));
  if (!s) throw new StbValidationError("not_found", "Shot not found");
  return s;
}

/** Resolves the project cast (REQ-AST-006 MVP: all attached entities apply to every shot). */
/**
 * REQ-STB-049: `entityIds` narrows a shot to the cast actually in it. Without it every prompt named
 * the whole cast, so a tram close-up mentioned the company and carried its logo as a reference.
 */
export async function resolveCast(db: Db, projectId: string, entityIds?: string[] | undefined) {
  const all = await listProjectEntities(db, projectId);
  const cast = entityIds?.length ? all.filter((e) => entityIds.includes(e.id)) : all;
  return {
    entities: cast.map((e) => ({ kind: e.kind, name: e.name, description: e.description, ...(e.profile ? { profile: e.profile } : {}) })), // REQ-AST-012
    entityRefAssetIds: cast.flatMap((e) => e.refAssetIds),
  };
}

/** REQ-STB-016: per-shot ref selection wins; null falls back to the whole-cast default. */
export function resolveShotRefs(shotRefAssetIds: string[] | null, castRefAssetIds: string[]): string[] {
  return shotRefAssetIds ?? castRefAssetIds;
}

// ---- Script studio (REQ-STB-008 / REQ-STB-011) ----

// TASK-DIR-004: the prose recipes are gone — the three prompt blocks are DERIVED from the
// project's Style Card, so editing an axis changes the prompts (REQ-STB-042).
// SR-DIR-008: a card compiled from the user's own brief wins over a built-in key. The two are
// mutually exclusive in the DB, so this is belt-and-braces ordering, not arbitration.
/**
 * REQ-STB-044 (USER 2026-07-26: "styling was not held in the images"): the card that decides how
 * the film looks, for a VISUAL prompt. `assembleFramePrompt` has accepted a card since REQ-GEN-026,
 * but nothing passed one — so the look reached a frame only when the planner happened to write it
 * into that shot's imagePrompt, and one shot came back as a cartoon.
 */
export async function projectCard(db: Db, projectId: string) {
  const [p] = await db.select().from(project).where(eq(project.id, projectId));
  if (!p) return undefined;
  if (p.styleCard) {
    const parsed = styleCardSchema.safeParse(p.styleCard);
    if (parsed.success) return parsed.data; // SR-DIR-008 compiled card wins
  }
  return p.archetype ? styleCards[p.archetype] : undefined;
}

export function recipeFor(p: { archetype?: string | null; styleCard?: unknown }) {
  const compiled = p.styleCard ? styleCardSchema.safeParse(p.styleCard) : undefined;
  const card = compiled?.success ? compiled.data : p.archetype ? styleCards[p.archetype] : undefined; // REQ-STB-026
  return card
    ? { directing: toDirectingBlock(card), planBias: toPlanBias(card), musicBias: toMusicBias(card) }
    : {};
}

export async function getProjectOrThrow(db: Db, projectId: string) {
  const [p] = await db.select().from(project).where(eq(project.id, projectId));
  if (!p) throw new StbValidationError("not_found", "Project not found");
  return p;
}
