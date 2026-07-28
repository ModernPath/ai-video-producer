// REQ-STB-032 / ADR-013 — music-led planning: the film plans against the REAL track.
//
// USER 2026-07-28: "the only way to nail it is to get the actual transcript and timestamps of the
// music BEFORE we generate any videoclips."
//
// Neon Rivers (2026-07-24) put verse text on screen at ~8s against vocals starting at 0:23. OQ-115
// proposed fixing that downstream — pad the pictures to reach the music, or trim the music to reach
// the pictures. Both were repairs for an ORDERING problem: the planner had no track to plan against.
//
// The planner already RECEIVES a transcript (REQ-STB-028). What was missing is anything making the
// track exist first, so on a fresh project the transcript is absent and the plan is made blind.
// Everything here is pure — a plan can be refused before a single cent is spent.
import { styleCards } from "@avd/shared/config";
import { styleCardSchema, type StyleCard } from "@avd/shared/contracts";

/**
 * The ONE place the "compiled card wins, else the archetype" rule lives.
 *
 * It was written twice in `common.ts` (`projectCard` and `recipeFor`) before this. A third copy for
 * this feature is exactly the shape that made `casting.ts` return `character` for `location`
 * (CLAUDE.md §1.11), so both callers now derive from here.
 */
export function cardFor(p: { archetype?: string | null; styleCard?: unknown }): StyleCard | undefined {
  if (p.styleCard) {
    const parsed = styleCardSchema.safeParse(p.styleCard);
    if (parsed.success) return parsed.data; // SR-DIR-008: a compiled card wins
  }
  return p.archetype ? styleCards[p.archetype] : undefined; // REQ-STB-026
}

/**
 * Music-led means the SONG is the fixed artifact and the pictures serve it — `audioMode: "music"`,
 * which replaces take audio entirely. `"mix"` beds music under native audio, so the pictures still
 * lead and today's planning order is correct for it (ADR-013).
 */
export function isMusicLed(card: { defaults?: { audioMode?: string | undefined } | undefined } | undefined): boolean {
  return card?.defaults?.audioMode === "music";
}

export interface MusicLedPlanState {
  isMusicLed: boolean;
  hasTrack: boolean;
  hasTranscript: boolean;
}

/**
 * Why this project cannot plan shots yet, or null. Same shape as `generationBlocker` in `chain.ts`
 * — a sentence naming the way out, not just the problem (the REQ-GEN-027 lesson: a user staring at
 * a refusal is precisely the person who cannot guess the fix).
 */
export function musicLedPlanBlocker(s: MusicLedPlanState): string | null {
  if (!s.isMusicLed) return null; // ADR-013: non-music-led planning is unchanged and ungated
  if (!s.hasTrack) {
    return "This film is cut to its music, so the shot plan needs the real track first — generate or attach one, then plan.";
  }
  if (!s.hasTranscript) {
    return "The track needs transcribing before planning, so shots can land on its sections — run the transcript, then plan.";
  }
  return null;
}
