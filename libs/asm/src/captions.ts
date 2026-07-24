// REQ-ASM-009: burned lyric captions — transcript ([MM:SS] lines, REQ-GEN-020) → SRT for ffmpeg subtitles.

interface Cue {
  startS: number;
  text: string;
}

const LINE = /^\[(\d{1,2}):(\d{2})\]\s*(.+)$/;

function fmt(t: number): string {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const ms = Math.round((t - Math.floor(t)) * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export interface TimedCue {
  startS: number;
  endS: number;
  text: string;
}

/**
 * REQ-ANM-003 slice 2 — the single timing source for captions: [MM:SS] lines → timed cues
 * (end = next cue's start, capped at the cut). SRT burn and the animated Remotion overlay
 * both derive from this, so their timings can never drift apart.
 */
export function transcriptToCues(
  transcript: string,
  totalDurationS: number,
  opts: { lyricsOnly?: boolean } = {}
): TimedCue[] {
  const cues: Cue[] = [];
  for (const raw of transcript.split("\n")) {
    const m = LINE.exec(raw.trim());
    if (!m) continue;
    const startS = Number(m[1]) * 60 + Number(m[2]);
    let text = m[3]!.trim();
    const stripped = text.replace(/^\[[^\]]+\]\s*/, "").trim();
    if (stripped) {
      text = stripped; // "[Verse] lyric" → "lyric" — tags are structure, not screen text
    } else if (opts.lyricsOnly) {
      continue; // pure section label — skip when only lyrics wanted
    }
    cues.push({ startS, text });
  }
  const visible = cues.filter((c) => c.startS < totalDurationS);
  return visible.map((c, i) => ({
    startS: c.startS,
    endS: Math.min(visible[i + 1]?.startS ?? totalDurationS, totalDurationS),
    text: c.text,
  }));
}

export function transcriptToSrt(
  transcript: string,
  totalDurationS: number,
  opts: { lyricsOnly?: boolean } = {}
): string {
  return transcriptToCues(transcript, totalDurationS, opts)
    .map((c, i) => `${i + 1}\n${fmt(c.startS)} --> ${fmt(c.endS)}\n${c.text}\n`)
    .join("\n");
}
