// REQ-STB-051 (USER 2026-07-27: "script planning could include some more iterations of adding
// critique steps from few angles and improve").
//
// `gradeShotGrammar` only catches what is mechanically checkable — a framing repeated, a line that
// will not fit the shot. It cannot tell you a beat is unmotivated, that the brand turns up in a
// shot with no reason to hold it, or that the film has no story. Those need reading, and a single
// reader has a single set of blind spots: a continuity supervisor and an editor notice different
// faults in the same plan. Each lens reads alone so they cannot converge on one opinion.
import { toDirectingBlock, type StyleCard } from "@avd/shared/contracts";
import type { NormalizedPlannedShot } from "./plan-normalize";

export interface CritiqueLens {
  id: string;
  /** What this reader is responsible for noticing — and, by omission, what they must ignore. */
  brief: string;
}

export const CRITIQUE_LENSES: readonly CritiqueLens[] = [
  {
    id: "pacing",
    brief:
      "You are the editor. Judge TIME: does each shot's length fit what happens in it — the words spoken, the physical actions, the pauses the style asks for? Flag shots that will end mid-sentence or mid-gesture, and shots holding far longer than their content earns.",
  },
  {
    id: "continuity",
    brief:
      "You are the continuity supervisor. Judge CONSISTENCY between shots: wardrobe, props, location, time of day, who was established where. Flag anything that changes between shots without the story changing it, and anyone appearing without ever having been introduced.",
  },
  {
    id: "casting",
    brief:
      "You are the first assistant director. Judge WHO AND WHAT IS ON SCREEN in each shot: is every listed cast member actually visible in that shot, and is anyone visible who was not listed? Flag brands or products listed for shots they have no reason to appear in.",
  },
  {
    id: "story",
    brief:
      "You are the script editor. Judge STRUCTURE: does the sequence build — setup, turn, payoff — or is it a list of pictures? Flag beats that do not advance anything, a payoff that arrives unearned, and an ending that stops rather than lands.",
  },
] as const;

export interface CritiqueIssue {
  shotTitle: string;
  severity: "error" | "warning";
  note: string;
}

export interface Critique {
  lens: string;
  issues: CritiqueIssue[];
}

export type MergedIssue = CritiqueIssue & { lens: string };

export function assembleCritiquePrompt(input: {
  lens: CritiqueLens;
  shots: NormalizedPlannedShot[];
  card: StyleCard | undefined;
}): string {
  return [
    `TASK: Critique this draft shot plan. ${input.lens.brief}`,
    // toDirectingBlock is provenance-free, so a compiled reference name cannot reach here either.
    input.card ? input.card && toDirectingBlock(input.card) : "",
    ``,
    `Report ONLY problems you can actually see from your seat — say nothing about matters outside your brief, and do not repeat a problem that is not there. An empty list is a valid and useful answer.`,
    `Return ONLY JSON: {"issues":[{"shotTitle":string,"severity":"error"|"warning","note":string}]} — no markdown fences, no commentary. "error" means the film is worse for shipping it; "warning" means it could be better.`,
    ``,
    `DRAFT PLAN:`,
    JSON.stringify({
      shots: input.shots.map((s) => ({
        title: s.title,
        durationS: s.durationS,
        cast: s.cast,
        ...s.grammar,
        ...s.direction,
      })),
    }),
  ].filter(Boolean).join("\n");
}

/** Everything every lens saw, attributed and worst-first. */
export function mergeCritiques(critiques: Critique[]): MergedIssue[] {
  const merged = critiques.flatMap((c) => c.issues.map((i) => ({ ...i, lens: c.lens })));
  // Errors before warnings; otherwise stable, so a shot's complaints stay together in lens order.
  return merged.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
}

// ---- Script critique (REQ-STB-052) ----
//
// USER 2026-07-27: "shouldn't it be run for the script?" It should, and earlier. Structure, runtime
// and who is in the film are decided in the SCRIPT; catching those in the shot plan means catching
// them after the fault has been broken into ten shots. A script has no framings or durations yet,
// so these lenses judge different things from the shot-plan ones — the same reviewers, reading a
// different document.
export const SCRIPT_LENSES: readonly CritiqueLens[] = [
  {
    id: "runtime",
    brief:
      "You are the editor. Judge whether this script FITS ITS RUNTIME. Count what each beat actually takes: speech runs about 2.5 words per second, a deliberate physical action needs 2–3 seconds, a held silence costs real time too. Flag beats given far less time than they need, beats padded beyond what they earn, and a total that does not add up to the stated runtime.",
  },
  {
    id: "story",
    brief:
      "You are the script editor. Judge STRUCTURE: is there a setup, a turn and a payoff, or is this a list of pictures? Flag an opening that starts on a logo rather than a situation, beats that advance nothing, a payoff that is not earned, and an ending that merely stops.",
  },
  {
    id: "cast",
    brief:
      "You are the first assistant director. Judge WHO IS IN THIS FILM: is every character who appears introduced before they matter, and is anyone required by a beat but never established? Flag characters mentioned once and abandoned, and any moment needing a second person the script never casts.",
  },
  {
    id: "voice",
    brief:
      "You are the director. Judge whether the writing MATCHES THE STYLE this film has committed to — its tone, its humour, and above all what it refuses. Flag dialogue that is more explanatory than the style allows, and any beat the style would reject outright.",
  },
] as const;

export function assembleScriptCritiquePrompt(input: {
  lens: CritiqueLens;
  scriptText: string;
  card: StyleCard | undefined;
  targetDurationS: number;
}): string {
  return [
    `TASK: Critique this draft script for a ${input.targetDurationS}-second film. ${input.lens.brief}`,
    input.card ? toDirectingBlock(input.card) : "",
    ``,
    `Report ONLY problems you can see from your seat. Say nothing about matters outside your brief. An empty list is a valid and useful answer.`,
    `Return ONLY JSON: {"issues":[{"shotTitle":string,"severity":"error"|"warning","note":string}]} — "shotTitle" is the scene or beat heading the issue belongs to. No markdown fences, no commentary.`,
    ``,
    `SCRIPT:`,
    input.scriptText,
  ].filter(Boolean).join("\n");
}

export function assembleScriptRedraftPrompt(input: {
  scriptText: string;
  issues: MergedIssue[];
  card: StyleCard | undefined;
  targetDurationS: number;
}): string {
  return [
    `TASK: Rewrite this ${input.targetDurationS}-second script so that every note below is resolved.`,
    input.card ? toDirectingBlock(input.card) : "",
    ``,
    `NOTES FROM THE REVIEWERS — each one must be answered:`,
    ...input.issues.map((i) => `- [${i.severity}] (${i.lens}) ${i.shotTitle}: ${i.note}`),
    ``,
    `Rules: keep what works — this is a revision, not a fresh idea. Keep the same subject and intent. Keep the total to ${input.targetDurationS} seconds, and make each beat's stated timing honest about what it contains.`,
    `Return the rewritten script in the same format as the original — prose and scene headings, not JSON, no commentary before or after.`,
    ``,
    `CURRENT SCRIPT:`,
    input.scriptText,
  ].filter(Boolean).join("\n");
}
