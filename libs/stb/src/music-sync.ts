// REQ-STB-025: lyric-synced cut suggestions — land shot boundaries on the track's
// section changes (from the MM:SS transcript, REQ-GEN-020) within the route's allowed durations.
import { shotDurationPolicy } from "@avd/shared/config";

const STAMP = /^\[(\d{1,2}):(\d{2})\]/;

/** Section boundary times in seconds (0 excluded — the video always starts on a boundary). */
export function parseSectionTimes(transcript: string): number[] {
  const times: number[] = [];
  for (const raw of transcript.split("\n")) {
    const m = STAMP.exec(raw.trim());
    if (!m) continue;
    const t = Number(m[1]) * 60 + Number(m[2]);
    if (t > 0 && !times.includes(t)) times.push(t);
  }
  return times.sort((a, b) => a - b);
}

export interface SyncShot {
  id: string;
  title: string;
  durationS: number;
}

export interface SyncSuggestion {
  shotId: string;
  title: string;
  fromS: number;
  toS: number;
  boundaryS: number; // the section boundary this change makes the cut land on
}

/**
 * Greedy pass: walk the cut in order; whenever choosing a different allowed duration
 * for the current shot would land its cut EXACTLY on an upcoming section boundary
 * (and the current duration doesn't), suggest the change. Later shots are evaluated
 * against the timeline as-if earlier suggestions were applied.
 */
export function suggestSyncDurations(
  shots: SyncShot[],
  sectionTimesS: number[]
): { suggestions: SyncSuggestion[]; boundaries: number[] } {
  const allowed = shotDurationPolicy().allowedS; // REQ-STB-029: omni route unlocks odd-second hits
  const suggestions: SyncSuggestion[] = [];
  let cursor = 0;
  for (const s of shots) {
    const currentCut = cursor + s.durationS;
    const currentHits = sectionTimesS.includes(currentCut);
    let chosen = s.durationS;
    if (!currentHits) {
      for (const d of allowed) {
        if (d === s.durationS) continue;
        if (sectionTimesS.includes(cursor + d)) {
          chosen = d;
          suggestions.push({ shotId: s.id, title: s.title, fromS: s.durationS, toS: d, boundaryS: cursor + d });
          break;
        }
      }
    }
    cursor += chosen;
  }
  return { suggestions, boundaries: sectionTimesS };
}
