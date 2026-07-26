// REQ-PRJ-006 (USER 2026-07-26: "it's only 30seconds instead of minute that I was asking for").
//
// The prompt said "1-minute feature film" and the project stayed at the 30s it was created with,
// because nothing ever read a runtime out of the user's own words. This does, conservatively:
// when in doubt it returns null and the existing target stands, since silently re-timing someone's
// film on a loose match would be worse than not reading it at all.
import { config } from "@avd/shared/config";

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  half: 0.5, a: 1, an: 1,
};

const num = (raw: string): number | null => {
  const n = WORD_NUMBERS[raw.toLowerCase()] ?? Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function parseRequestedDurationS(brief: string): number | null {
  if (!brief.trim()) return null;
  const text = brief.toLowerCase();

  // Ordered by specificity: M:SS before minutes before seconds, so "1:30" is not read as "1 minute".
  const patterns: Array<{ re: RegExp; toSeconds: (m: RegExpMatchArray) => number | null }> = [
    { re: /\b(\d{1,2}):([0-5]\d)\b/, toSeconds: (m) => Number(m[1]) * 60 + Number(m[2]) },
    {
      re: /\b([\d.]+|one|two|three|four|five|six|seven|eight|nine|ten|half|an?)[\s-]*(?:minute|minutes|min|mins)\b/,
      toSeconds: (m) => { const n = num(m[1]!); return n === null ? null : Math.round(n * 60); },
    },
    {
      re: /\b([\d.]+|one|two|three|four|five|six|seven|eight|nine|ten|an?)[\s-]*(?:seconds?|secs?|s)\b/,
      toSeconds: (m) => { const n = num(m[1]!); return n === null ? null : Math.round(n); },
    },
  ];

  // Take the FIRST runtime mentioned in the text, whichever pattern matches it — "a 1-minute film,
  // cut down from a 3 minute version" asks for 60s.
  let best: { index: number; seconds: number } | null = null;
  for (const { re, toSeconds } of patterns) {
    const m = text.match(re);
    if (!m || m.index === undefined) continue;
    const seconds = toSeconds(m);
    if (seconds === null) continue;
    if (!best || m.index < best.index) best = { index: m.index, seconds };
  }
  if (!best) return null;

  const { minTargetSeconds, maxTargetSeconds } = config.project;
  // Out of range means this was not a runtime at all ("shot on 16mm", "a 3 hour epic") — say
  // nothing rather than clamp, so the project keeps whatever the user already set.
  return best.seconds >= minTargetSeconds && best.seconds <= maxTargetSeconds ? best.seconds : null;
}
