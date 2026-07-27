// USER BUG 2026-07-23: the real model's shot-plan JSON varies in shape/keys/durations.
// Normalize defensively so "Break into shots" always yields usable shots (or a clear failure).
import {
  config, fullFrameAnimationTemplates, shotAngles, shotDurationPolicy, shotMovements, shotSizes,
  type FullFrameAnimationTemplate, type ShotAngle, type ShotMovement, type ShotSize,
} from "@avd/shared/config";
import type { DirectionJson } from "./service";

export interface PlannedAnimation {
  template: FullFrameAnimationTemplate; // REQ-STB-036: the full template set, not just title/kinetic
  text: string;
  subtext?: string | undefined;
  /** REQ-ANM-005: plan-authored palette (hex only — junk dropped, defaults apply). */
  accent?: string | undefined;
  background?: string | undefined;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** SR-DIR-001: the craft the shot is framed with, so the director's pass can grade it. */
export interface PlannedGrammar {
  shotSize: ShotSize;
  angle: ShotAngle;
  movement: ShotMovement;
}

export interface NormalizedPlannedShot {
  title: string;
  durationS: number;
  grammar: PlannedGrammar;
  /** REQ-STB-049: names of the cast physically in THIS shot — drives its reference images. */
  cast: string[];
  direction: DirectionJson;
  imagePrompt?: string | undefined;
  videoPrompt?: string | undefined;
  animation?: PlannedAnimation | undefined; // REQ-STB-024: pure-graphic shots render via Remotion, free
}

function snapDuration(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  const fallback = config.shot.defaultSeconds;
  const allowed = shotDurationPolicy().allowedS; // REQ-STB-029: route-aware palette
  const target = Number.isFinite(n) && n > 0 ? n : fallback;
  return allowed.reduce((best, d) =>
    Math.abs(d - target) < Math.abs(best - target) || (Math.abs(d - target) === Math.abs(best - target) && d > best) ? d : best
  );
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Models write "wide" and "Push In" as readily as "WS" and "push-in", so accept the long forms —
// but drop anything outside the vocabulary rather than trusting invented terms like "drone-orbit".
const SIZE_WORDS: Record<string, ShotSize> = {
  "extreme wide": "EWS", "very wide": "EWS", establishing: "EWS",
  wide: "WS", "medium wide": "MW", "medium long": "MW",
  medium: "MS", "medium close-up": "MCU", "medium close up": "MCU",
  "close-up": "CU", "close up": "CU", close: "CU",
  "extreme close-up": "ECU", "extreme close up": "ECU", macro: "ECU",
};
const MOVE_WORDS: Record<string, ShotMovement> = {
  locked: "static", "locked off": "static", still: "static", fixed: "static",
  "push in": "push-in", pushin: "push-in", dolly: "push-in", "dolly in": "push-in",
  "pull out": "pull-out", pullout: "pull-out", "dolly out": "pull-out",
  track: "tracking", trucking: "tracking", handheld: "handheld", crane: "crane",
  pan: "pan", tilt: "tilt",
};

function pick<T extends string>(v: unknown, allowed: readonly T[], words: Record<string, T>, fallback: T): T {
  const raw = str(v);
  if (!raw) return fallback;
  const upper = raw.toUpperCase();
  if ((allowed as readonly string[]).includes(upper)) return upper as T;
  const lower = raw.toLowerCase();
  if ((allowed as readonly string[]).includes(lower)) return lower as T;
  return words[lower] ?? fallback;
}

export function normalizePlannedShots(raw: unknown): NormalizedPlannedShot[] {
  let list: unknown[] | null = null;
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["shots", "plan", "scenes", "clips"]) {
      if (Array.isArray(o[key])) {
        list = o[key] as unknown[];
        break;
      }
    }
  }
  if (!list) return [];

  const out: NormalizedPlannedShot[] = [];
  for (const [i, item] of list.entries()) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const dirRaw = (s.direction && typeof s.direction === "object" ? s.direction : {}) as Record<string, unknown>;
    const imagePrompt = str(s.imagePrompt) || str(s.image_prompt) || str(s.imageScript) || str(s.image_script);
    const videoPrompt = str(s.videoPrompt) || str(s.video_prompt) || str(s.videoScript) || str(s.video_script);
    const synopsis = str(dirRaw.synopsis) || str(s.synopsis) || str(s.description) || imagePrompt.slice(0, 120);
    if (!synopsis && !imagePrompt && !videoPrompt) continue; // nothing creative to work with

    out.push({
      title: str(s.title) || str(s.name) || `Shot ${i + 1}`,
      durationS: snapDuration(s.durationS ?? s.duration ?? s.durationSeconds ?? s.duration_seconds),
      cast: Array.isArray(s.cast)
        ? (s.cast as unknown[]).filter((c): c is string => typeof c === "string" && c.trim().length > 0).map((c) => c.trim())
        : [],
      grammar: ((): PlannedGrammar => {
        // Top level, inside `direction`, or inside `grammar` — models use the first two, and the
        // THIRD is our own output: a stored proposal is normalized already, so anything re-reading
        // it normalizes twice and must not lose the craft it wrote itself (live bug 2026-07-26).
        const g = (s.grammar && typeof s.grammar === "object" ? s.grammar : {}) as Record<string, unknown>;
        return {
          shotSize: pick(s.shotSize ?? s.shot_size ?? dirRaw.shotSize ?? dirRaw.shot_size ?? g.shotSize, shotSizes, SIZE_WORDS, "MS"),
          angle: pick(s.angle ?? dirRaw.angle ?? g.angle, shotAngles, {}, "eye"),
          movement: pick(s.movement ?? s.camera_movement ?? dirRaw.movement ?? dirRaw.camera_movement ?? g.movement, shotMovements, MOVE_WORDS, "static"),
        };
      })(),
      direction: {
        synopsis: synopsis || `Shot ${i + 1}`,
        subject: str(dirRaw.subject) || str(s.subject) || "main subject",
        action: str(dirRaw.action) || str(s.action) || "as described",
        ...(str(dirRaw.camera) || str(s.camera) ? { camera: str(dirRaw.camera) || str(s.camera) } : {}),
        ...(str(dirRaw.mood) || str(s.mood) ? { mood: str(dirRaw.mood) || str(s.mood) } : {}),
        ...(str(dirRaw.dialogue) || str(s.dialogue) ? { dialogue: str(dirRaw.dialogue) || str(s.dialogue) } : {}),
      },
      ...(imagePrompt ? { imagePrompt } : {}),
      ...(videoPrompt ? { videoPrompt } : {}),
      ...((): { animation?: PlannedAnimation } => {
        const a = s.animation as Record<string, unknown> | undefined;
        if (a && (fullFrameAnimationTemplates as readonly unknown[]).includes(a.template) && typeof a.text === "string" && a.text.trim()) {
          return { animation: {
            template: a.template as FullFrameAnimationTemplate,
            text: a.text.trim(),
            ...(typeof a.subtext === "string" && a.subtext.trim() ? { subtext: a.subtext.trim() } : {}),
            // REQ-ANM-005: hex-only palette — real models emit names/gradients too; drop those
            ...(typeof a.accent === "string" && HEX_COLOR.test(a.accent.trim()) ? { accent: a.accent.trim() } : {}),
            ...(typeof a.background === "string" && HEX_COLOR.test(a.background.trim()) ? { background: a.background.trim() } : {}),
          } };
        }
        return {};
      })(),
    });
  }
  return out;
}
