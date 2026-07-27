// SR-DIR-006 (EPIC-STB-001, TASK-DIR-005) — the director's pass.
//
// USER 2026-07-26: "Director's pass would be quite cool." docs/87 held six craft principles as
// prose inside a prompt, generated once and accepted. This grades the draft plan against the
// project's ACTIVE Style Card, so the notes read "this film promised static frames and you planned
// three push-ins" instead of generic advice — and then asks for a revision that fixes exactly
// those notes.
//
// `reviewPlan` is pure and synchronous: a plan can be graded for free, before a single frame or
// take is billed (SCN-DIR-003's "not billed" clause). Only the revision costs a text call.
import { toDirectingBlock, toGrammarConstraints, type StyleCard } from "@avd/shared/contracts";
import { gradeShotGrammar, type GrammarNote } from "./grammar";
import type { NormalizedPlannedShot } from "./plan-normalize";

/** Grade a draft plan against the active card (or the universal principles when none is set). */
export function reviewPlan(shots: NormalizedPlannedShot[], card: StyleCard | undefined): GrammarNote[] {
  return gradeShotGrammar(
    shots.map((s, i) => ({
      id: String(i),
      title: s.title,
      durationS: s.durationS,
      shotSize: s.grammar.shotSize,
      angle: s.grammar.angle,
      movement: s.grammar.movement,
      ...(s.direction.action ? { action: s.direction.action } : {}),
      ...(s.direction.dialogue ? { dialogue: s.direction.dialogue } : {}), // REQ-STB-050
      ...(s.animation ? { isAnimation: true } : {}),
    })),
    // No card means no refusals and no pacing window — only what is true of every film.
    card ? toGrammarConstraints(card) : {}
  );
}

export interface DirectorPassInput {
  shots: NormalizedPlannedShot[];
  notes: GrammarNote[];
  card: StyleCard | undefined;
}

/** Ask for a revision that fixes THESE notes, in the same JSON shape the planner emits. */
export function assembleDirectorPassPrompt(i: DirectorPassInput): string {
  return [
    `TASK: You are the director reviewing a draft shot plan. Revise it so that every note below is resolved.`,
    // toDirectingBlock is provenance-free, so the reference the card was compiled from cannot
    // reach this prompt either — the plan it produces authors the visual prompts.
    i.card ? toDirectingBlock(i.card) : "",
    ``,
    `NOTES FROM THE GRADE — each one must be fixed:`,
    ...i.notes.map((n) => `- [${n.severity}] ${n.note}`),
    ``,
    `Rules for the revision:`,
    `- Fix the notes by changing framing, angle, camera movement, shot length or by splitting a shot — not by deleting the story.`,
    `- Keep the same subject matter and running order unless a note requires otherwise.`,
    `- Every shot must state its own "shotSize", "angle" and "movement".`,
    ``,
    `Return ONLY the revised plan as JSON in exactly the shape you were given: {"shots":[{"title":…,"durationS":…,"shotSize":…,"angle":…,"movement":…,"direction":{…},"imagePrompt":…,"videoPrompt":…,"animation":…}]} — no markdown fences, no commentary.`,
    ``,
    `DRAFT PLAN:`,
    JSON.stringify({ shots: i.shots }),
  ].filter(Boolean).join("\n");
}

/** A one-line summary for the UI: what the director thought of this plan. */
export function summarizeNotes(notes: GrammarNote[]): string {
  if (!notes.length) return "The plan honours the style.";
  const errors = notes.filter((n) => n.severity === "error").length;
  const warnings = notes.length - errors;
  const parts = [errors ? `${errors} to fix` : "", warnings ? `${warnings} to consider` : ""].filter(Boolean);
  return `Director's notes: ${parts.join(" · ")}`;
}
