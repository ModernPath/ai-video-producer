// REQ-STB-039 / REQ-STB-040 — the cut as a time axis, so music timing is visible per clip.
// USER 2026-07-25: "it would be nice to see the music timing within the clips, like traditional
// video editors do? Because if I e.g. add new clip, it might outsync the video. Maybe also being
// able to edit the length of clips (+regenerate or crop the video/animation)".
//
// Pure read-model: shots in order → blocks on the track's timeline, plus the two facts that decide
// whether a duration edit is free. The export normalizes each clip with `-t durationS`
// (libs/asm/src/service.ts), so a shot SHORTER than its take already crops for free; a shot LONGER
// than its take has no footage to show and needs a regenerate.

export interface TimelineShotInput {
  id: string;
  title: string;
  durationS: number;
  /** The selected take's real length, when it has one. */
  takeActualS?: number | null;
}

export interface TimelineBlock {
  id: string;
  title: string;
  startS: number;
  endS: number;
  durationS: number;
  /** This clip's cut lands exactly on a music section change. */
  onBoundary: boolean;
  /** Seconds the export will crop off the take (free — ffmpeg `-t`). */
  trimmedS: number;
  /** Seconds of footage the take is missing for this duration (needs a regenerate). */
  shortfallS: number;
}

export interface Timeline {
  blocks: TimelineBlock[];
  cutDurationS: number;
  trackDurationS: number | null;
  /** cut − track: positive = the cut runs past the track, negative = track left over. */
  driftS: number | null;
  boundaries: number[];
  /** Clips whose cut misses every section change (only counted when a transcript exists). */
  desyncedCount: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildTimeline(input: {
  shots: TimelineShotInput[];
  sectionTimesS: number[];
  trackDurationS: number | null;
}): Timeline {
  const boundaries = [...input.sectionTimesS].sort((a, b) => a - b);
  const blocks: TimelineBlock[] = [];
  let cursor = 0;
  for (const s of input.shots) {
    const startS = round1(cursor);
    const endS = round1(cursor + s.durationS);
    const take = s.takeActualS ?? null;
    blocks.push({
      id: s.id,
      title: s.title,
      startS,
      endS,
      durationS: round1(s.durationS),
      onBoundary: boundaries.some((b) => Math.abs(b - endS) < 0.05),
      trimmedS: take !== null && take > s.durationS ? round1(take - s.durationS) : 0,
      shortfallS: take !== null && take < s.durationS ? round1(s.durationS - take) : 0,
    });
    cursor = endS;
  }
  const cutDurationS = round1(cursor);
  return {
    blocks,
    cutDurationS,
    trackDurationS: input.trackDurationS,
    driftS: input.trackDurationS === null ? null : round1(cutDurationS - input.trackDurationS),
    boundaries,
    desyncedCount: boundaries.length ? blocks.filter((b) => !b.onBoundary).length : 0,
  };
}
