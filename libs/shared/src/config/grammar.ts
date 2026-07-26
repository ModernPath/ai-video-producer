// SR-DIR-001 (EPIC-STB-001) — the shot-grammar vocabulary.
//
// docs/87-directing-playbook.md states craft as prose ("alternate wide/close", "one idea per
// shot"), injected into prompt strings and then hoped for. Nothing could check a plan against it
// because `direction.camera` is free text. This is that vocabulary as data: a Style Card selects
// from it, the shot plan speaks it, and libs/stb/src/grammar.ts grades against it.
//
// Config, not literals: widening the vocabulary means editing THIS file.

/** Framing, widest to tightest. Order is meaningful — adjacency distance drives contrast checks. */
export const shotSizes = ["EWS", "WS", "MW", "MS", "MCU", "CU", "ECU"] as const;
export type ShotSize = (typeof shotSizes)[number];

export const shotAngles = ["eye", "low", "high", "overhead", "dutch"] as const;
export type ShotAngle = (typeof shotAngles)[number];

export const shotMovements = [
  "static", "pan", "tilt", "push-in", "pull-out", "tracking", "handheld", "crane",
] as const;
export type ShotMovement = (typeof shotMovements)[number];

export const shotSizeLabels: Record<ShotSize, string> = {
  EWS: "extreme wide", WS: "wide", MW: "medium wide", MS: "medium",
  MCU: "medium close-up", CU: "close-up", ECU: "extreme close-up",
};

/** Grader thresholds — tuning taste means editing these, never a literal in the grader. */
export const grammarPolicy = {
  /** A closing shot should be at least this share of the longest shot to read as "held". */
  heldEndingRatio: 0.75,
  /** Below this many distinct shot sizes, a multi-shot plan is monotonous. */
  minDistinctSizes: 2,
  /** A plan shorter than this is too small for coverage rules to mean anything. */
  coverageMinShots: 3,
  /** More independent actions than this in one shot direction fights "one idea per shot". */
  maxActionsPerShot: 2,
} as const;
