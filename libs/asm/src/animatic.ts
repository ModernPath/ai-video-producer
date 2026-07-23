// REQ-ASM-009 / BR-ASM-005 — animatic timing math. Pure; the player component consumes it.
export interface AnimaticShot {
  id: string;
  durationS: number;
  frameAssetId: string | null;
  title: string;
}

export interface Cue {
  shotId: string;
  title: string;
  frameAssetId: string;
  startS: number;
  durationS: number;
}

export interface CueList {
  items: Cue[];
  total: number;
  skipped: string[]; // titles of shots without any frame (BR: animatic shows what exists, names what's missing)
}

export function buildCues(shots: AnimaticShot[]): CueList {
  const items: Cue[] = [];
  const skipped: string[] = [];
  let t = 0;
  for (const s of shots) {
    if (!s.frameAssetId) {
      skipped.push(s.title);
      continue;
    }
    items.push({ shotId: s.id, title: s.title, frameAssetId: s.frameAssetId, startS: t, durationS: s.durationS });
    t += s.durationS;
  }
  return { items, total: t, skipped };
}

/** Active cue at time t (clamped to first at t<0); null when the animatic has finished. */
export function cueAtTime(cues: CueList, t: number): Cue | null {
  if (!cues.items.length || t >= cues.total) return null;
  if (t < 0) return cues.items[0] ?? null;
  for (let i = cues.items.length - 1; i >= 0; i--) {
    const c = cues.items[i]!;
    if (t >= c.startS) return c;
  }
  return cues.items[0] ?? null;
}
