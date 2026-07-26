// SR-DIR-003 (EPIC-STB-001, TASK-DIR-002) — the Style Card contract. Zod is canonical (ADR-003).
//
// A Style Card is what "directed by X, a bit humoristic" compiles DOWN TO. It replaces
// `ArchetypeRecipe`, whose three fields were English paragraphs pasted into prompts: prose could
// not be graded, could not be edited axis by axis, and had no way to say what a style REFUSES.
//
// Governing constraint of the epic: `provenance` (the brief and any reference name) is
// display-only. It is used ONCE, by the compiler, with grounded research; afterwards the craft
// axes carry the intent and no prompt ever sees the name. `toDirectingBlock` and `toVisualStyle`
// build exclusively from the craft axes, and the shot planner — which authors the visual prompts
// itself — is told explicitly never to name a real director, artist or brand.
import { z } from "zod";
import { shotAngles, shotMovements, shotSizes } from "../config/grammar";
import type { ShotMovement } from "../config/grammar";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb hex colour");

export const styleCardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),

  /** Display-only provenance. NEVER reaches a prompt — see the module note. */
  provenance: z.object({
    /** The user's own words, verbatim, so they can see what was compiled. */
    brief: z.string().optional(),
    /** Reference directors/works the compiler grounded on, for attribution in the UI. */
    references: z.array(z.string()).default([]),
  }),

  structure: z.object({
    /** The emotional arc — docs/87 principle 1: structure before beauty. */
    arc: z.string().min(1),
    /** Rough shot count for the target duration; the planner is biased toward it. */
    shotCountHint: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
  }),

  camera: z.object({
    allowedMovements: z.array(z.enum(shotMovements)).min(1, "a style must allow at least one camera movement"),
    preferredSizes: z.array(z.enum(shotSizes)).min(1),
    angles: z.array(z.enum(shotAngles)).min(1),
    notes: z.string().default(""),
  }),

  pacing: z.object({
    durationWindowS: z.tuple([z.number().positive(), z.number().positive()])
      .refine(([min, max]) => min <= max, "duration window must be [min, max]"),
  }),

  /** Drives image prompts AND animation render props — one palette for footage and graphics. */
  palette: z.object({ accent: hex, background: hex, notes: z.string().default("") }),

  light: z.string().default(""),
  performance: z.string().default(""),
  /** The axis no archetype had: comic register and timing. */
  humour: z.string().default(""),
  sound: z.string().default(""),
  typography: z.string().default(""),

  /** What this style refuses to do. Required — a style with no refusals has no point of view. */
  antiNotes: z.array(z.string()),
});

export type StyleCard = z.infer<typeof styleCardSchema>;

/** Feed the card's own axes to the grammar grader (SR-DIR-002). */
export function toGrammarConstraints(card: StyleCard): {
  allowedMovements: readonly ShotMovement[];
  durationWindowS: readonly [number, number];
} {
  return { allowedMovements: card.camera.allowedMovements, durationWindowS: card.pacing.durationWindowS };
}

/** TEXT prompts (script + shot plan). Craft axes only — never `provenance`. */
export function toDirectingBlock(card: StyleCard): string {
  const lines = [
    `DIRECTING (${card.name}):`,
    `Arc: ${card.structure.arc}`,
    card.structure.shotCountHint ? `Plan roughly ${card.structure.shotCountHint[0]}–${card.structure.shotCountHint[1]} shots.` : "",
    `Camera: ${card.camera.notes} Movement is limited to: ${card.camera.allowedMovements.join(", ")}. Favour ${card.camera.preferredSizes.join("/")} framing at ${card.camera.angles.join("/")} angle.`,
    `Hold shots ${card.pacing.durationWindowS[0]}–${card.pacing.durationWindowS[1]} seconds.`,
    card.light ? `Light: ${card.light}` : "",
    card.palette.notes ? `Colour: ${card.palette.notes}` : "",
    card.performance ? `Performance: ${card.performance}` : "",
    card.humour ? `Humour: ${card.humour}` : "",
    card.sound ? `Sound: ${card.sound}` : "",
    card.typography ? `Typography: ${card.typography}` : "",
    card.antiNotes.length ? `AVOID — this style refuses: ${card.antiNotes.join("; ")}.` : "",
    // The planner writes imagePrompt/videoPrompt itself, so the rail has to sit here too, or a
    // name would reach the visual models by the back door.
    `Describe the look in concrete craft terms only — never name a real director, artist, studio or brand in any prompt you write.`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** VISUAL prompts (frame + take). Craft axes only — never `provenance`. */
export function toVisualStyle(card: StyleCard): string {
  return [card.camera.notes, card.light, card.palette.notes, card.performance, card.typography]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}
