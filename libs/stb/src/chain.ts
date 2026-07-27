// REQ-STB-055 (USER 2026-07-27) — a continuity chain has an order, and generating out of it wastes
// money. "so we can see the dependency and continue as the video for first is generated."
//
// A shot that continues another starts from that take's LAST FRAME (REQ-STB-054). Generate the
// follower first and there is no frame to start from: the take is bought, the chain is silently
// defeated, and nothing tells you. So the order is enforced and the reason is named.
export interface ChainShot {
  id: string;
  title: string;
  position: number;
  continuesFromShotId: string | null;
  selectedTakeId: string | null;
}

const MAX_WALK = 200; // corrupt data must terminate, not hang the page

/** The whole chain containing this shot, head first. A lone shot is a chain of one. */
export function chainOrder(shots: ChainShot[], shotId: string): ChainShot[] {
  const byId = new Map(shots.map((s) => [s.id, s]));
  const start = byId.get(shotId);
  if (!start) return [];

  // Walk back to the head. `seen` guards a cycle the validator should have refused but data can
  // still contain — a page must not hang because a row is wrong.
  let head = start;
  const seen = new Set<string>([head.id]);
  for (let i = 0; i < MAX_WALK; i++) {
    const prev = head.continuesFromShotId ? byId.get(head.continuesFromShotId) : undefined;
    if (!prev || seen.has(prev.id)) break;
    seen.add(prev.id);
    head = prev;
  }

  const out = [head];
  const visited = new Set<string>([head.id]);
  for (let i = 0; i < MAX_WALK; i++) {
    const next = shots.find((s) => s.continuesFromShotId === out[out.length - 1]!.id && !visited.has(s.id));
    if (!next) break;
    visited.add(next.id);
    out.push(next);
  }
  return out;
}

/** Where this shot sits in its chain, or null when it is not chained to anything. */
export function chainFor(
  shots: ChainShot[],
  shotId: string
): { headId: string; length: number; index: number } | null {
  const chain = chainOrder(shots, shotId);
  if (chain.length < 2) return null;
  return { headId: chain[0]!.id, length: chain.length, index: chain.findIndex((s) => s.id === shotId) };
}

/**
 * Why this shot cannot be generated yet, or null. Names the shot holding it up: "waiting for X"
 * is answerable, "blocked" is not.
 */
export function generationBlocker(shots: ChainShot[], shotId: string): string | null {
  const byId = new Map(shots.map((s) => [s.id, s]));
  const s = byId.get(shotId);
  if (!s?.continuesFromShotId) return null;
  const source = byId.get(s.continuesFromShotId);
  if (!source) return null; // the source was cut; the chain is broken, not blocked
  if (source.selectedTakeId) return null;
  return `Continues ${source.title} — generate and choose that take first, so this shot can start from its last frame.`;
}

/**
 * REQ-STB-056 (USER 2026-07-27: "indicate at timeline which clips are linked, e.g. 4, 4.1, 4.2").
 *
 * Display numbers where a chain reads as one shot with sub-clips. Followers do NOT consume
 * top-level numbers, so a film of 1,2,3,4,4.1,4.2 continues at 5 — the numbering describes the
 * FILM's structure, not the row count.
 */
export function chainLabels(shots: ChainShot[]): Map<string, string> {
  const byId = new Map(shots.map((s) => [s.id, s]));
  const out = new Map<string, string>();
  let top = 0;
  const subCounters = new Map<string, number>();

  for (const s of shots) {
    // A follower whose source is gone is not a sub-clip of anything — number it normally.
    const source = s.continuesFromShotId ? byId.get(s.continuesFromShotId) : undefined;
    const sourceLabel = source ? out.get(source.id) : undefined;
    if (!sourceLabel) {
      top += 1;
      out.set(s.id, String(top));
      continue;
    }
    // Sub-clips of a sub-clip stay flat under the chain HEAD: 4.1, 4.2 — not 4.1.1.
    const headLabel = sourceLabel.split(".")[0]!;
    const n = (subCounters.get(headLabel) ?? 0) + 1;
    subCounters.set(headLabel, n);
    out.set(s.id, `${headLabel}.${n}`);
  }
  return out;
}
