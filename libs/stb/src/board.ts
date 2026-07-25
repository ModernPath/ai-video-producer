// REQ-STB-037 — board read-model helpers for the workspace UI (USER 2026-07-25 UX review).
// Status and progress were computed inline in the page markup; the workspace shows them in three
// places (rail, command bar, export button) so they live here as one tested rule.

export type BoardShotStatus = "planned" | "framed" | "generated";

/** A shot is `generated` once a take is selected, `framed` once it has frame candidates. */
export function shotStatus(input: { selectedTakeId: string | null; frameCount: number }): BoardShotStatus {
  if (input.selectedTakeId) return "generated";
  return input.frameCount > 0 ? "framed" : "planned";
}

export interface BoardProgress {
  generated: number;
  total: number;
  /** Every shot has a take — a full-length export needs no skips (INV-ASM-002). */
  ready: boolean;
  /** Shot ids an export would have to skip explicitly. */
  pending: string[];
}

export function boardProgress(shots: Array<{ id?: string; selectedTakeId: string | null }>): BoardProgress {
  const generated = shots.filter((s) => s.selectedTakeId).length;
  return {
    generated,
    total: shots.length,
    ready: shots.length > 0 && generated === shots.length,
    pending: shots.filter((s) => !s.selectedTakeId).map((s) => s.id ?? ""),
  };
}
