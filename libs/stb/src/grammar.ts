// SR-DIR-002 (EPIC-STB-001, TASK-DIR-001) — grade a shot list against the craft principles of
// docs/87-directing-playbook.md, so "good direction" is checkable instead of hoped-for.
//
// This is the shared language of the epic: the Style Card compiler emits constraints in these
// terms, and the director's pass (TASK-DIR-005) turns these notes into a plan revision. Pure and
// synchronous — no model call — so the UI can grade a draft plan for free, before anything is paid
// for (SCN-DIR-003's "not billed" clause).
import {
  grammarPolicy, shotSizeLabels,
  type ShotAngle, type ShotMovement, type ShotSize,
} from "@avd/shared/config";

export interface GradedShot {
  id: string;
  title: string;
  durationS: number;
  shotSize: ShotSize;
  angle: ShotAngle;
  movement: ShotMovement;
  /** The shot's action line — checked for competing ideas. */
  action?: string;
  /** Graphic shots are exempt from the held-ending rule: an end-card IS the held ending. */
  isAnimation?: boolean;
}

/** Constraints a Style Card imposes on top of the universal principles. */
export interface GrammarConstraints {
  /** Movements the style permits; anything else is an anti-note violation. */
  allowedMovements?: readonly ShotMovement[];
  /** Inclusive [min, max] shot length the style calls for. */
  durationWindowS?: readonly [number, number];
}

export type GrammarRule =
  | "contrast-cut" | "held-ending" | "forbidden-movement"
  | "duration-window" | "one-idea" | "coverage";

export interface GrammarNote {
  rule: GrammarRule;
  severity: "error" | "warning";
  /** The shots the note is about — the UI highlights these. */
  shotIds: string[];
  /** Plain-language note, written to be shown to a director-user verbatim. */
  note: string;
}

/**
 * "she pours the coffee and then walks out to the harbour and lights a cigarette" → 3.
 * Plain "and" has to count, since that is how a planner actually chains beats — but noun
 * conjunctions ("a man and a woman sit") must not, so a fragment only counts once it is long
 * enough to carry its own verb phrase.
 */
function countActions(action: string): number {
  return action
    .split(/\band\b|\bwhile\b|\bbefore\b|\bafter which\b|;/i)
    .filter((c) => c.trim().split(/\s+/).filter(Boolean).length >= 2)
    .length;
}

export function gradeShotGrammar(shots: GradedShot[], constraints: GrammarConstraints = {}): GrammarNote[] {
  const notes: GrammarNote[] = [];
  if (shots.length === 0) return notes;

  // docs/87 principle 4 — contrast cuts. A repeat is forgiven when the angle changes, because the
  // composition genuinely differs even at the same framing.
  for (let i = 1; i < shots.length; i++) {
    const prev = shots[i - 1]!, cur = shots[i]!;
    if (prev.shotSize === cur.shotSize && prev.angle === cur.angle) {
      notes.push({
        rule: "contrast-cut",
        severity: "error",
        shotIds: [prev.id, cur.id],
        note: `${prev.title} and ${cur.title} are both ${prev.shotSize} (${shotSizeLabels[prev.shotSize]}) at the same angle — alternate the framing or change the angle.`,
      });
    }
  }

  // docs/87 principle 6 — end with a held frame. A graphic end-card already is one.
  const last = shots[shots.length - 1]!;
  if (shots.length > 1 && !last.isAnimation) {
    const longest = Math.max(...shots.map((s) => s.durationS));
    if (last.durationS < longest * grammarPolicy.heldEndingRatio) {
      notes.push({
        rule: "held-ending",
        severity: "warning",
        shotIds: [last.id],
        note: `The film ends on ${last.title} at ${last.durationS}s while its longest shot runs ${longest}s — end on the calmest, longest shot or a held end-card, never cut away from the climax.`,
      });
    }
  }

  // Style Card anti-notes — the axis that says what this style refuses to do.
  if (constraints.allowedMovements) {
    const allowed = constraints.allowedMovements;
    const offenders = shots.filter((s) => !allowed.includes(s.movement));
    if (offenders.length) {
      notes.push({
        rule: "forbidden-movement",
        severity: "error",
        shotIds: offenders.map((s) => s.id),
        note: `This style allows only ${allowed.join(", ")} camera — ${offenders.map((s) => `${s.title} (${s.movement})`).join(", ")} ${offenders.length === 1 ? "breaks" : "break"} it.`,
      });
    }
  }

  if (constraints.durationWindowS) {
    const [min, max] = constraints.durationWindowS;
    const offenders = shots.filter((s) => s.durationS < min || s.durationS > max);
    if (offenders.length) {
      notes.push({
        rule: "duration-window",
        severity: "warning",
        shotIds: offenders.map((s) => s.id),
        note: `This style holds shots ${min}–${max}s — ${offenders.map((s) => `${s.title} (${s.durationS}s)`).join(", ")} ${offenders.length === 1 ? "sits" : "sit"} outside that.`,
      });
    }
  }

  // docs/87 principle 2 — one idea per shot.
  for (const s of shots) {
    if (s.action && countActions(s.action) > grammarPolicy.maxActionsPerShot) {
      notes.push({
        rule: "one-idea",
        severity: "warning",
        shotIds: [s.id],
        note: `${s.title} has ${countActions(s.action)} competing actions — a shot advances exactly one beat; split it.`,
      });
    }
  }

  // Coverage — makes a monotonous plan visible before it is generated.
  if (shots.length >= grammarPolicy.coverageMinShots) {
    const distinct = new Set(shots.map((s) => s.shotSize));
    if (distinct.size < grammarPolicy.minDistinctSizes) {
      notes.push({
        rule: "coverage",
        severity: "warning",
        shotIds: shots.map((s) => s.id),
        note: `Every shot is framed the same way — the plan uses only one shot size (${[...distinct][0]}). Vary the coverage.`,
      });
    }
  }

  // Errors first: a director reads the worst problem, not the first one found.
  return notes.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
}
