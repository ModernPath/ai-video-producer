// USER BUG 2026-07-23: the real model's shot-plan JSON varies in shape/keys/durations.
// Normalize defensively so "Break into shots" always yields usable shots (or a clear failure).
import { config, providerLimits } from "@avd/shared/config";
import type { DirectionJson } from "./service";

export interface PlannedAnimation {
  template: "title" | "kinetic";
  text: string;
  subtext?: string | undefined;
}

export interface NormalizedPlannedShot {
  title: string;
  durationS: number;
  direction: DirectionJson;
  imagePrompt?: string | undefined;
  videoPrompt?: string | undefined;
  animation?: PlannedAnimation | undefined; // REQ-STB-024: pure-graphic shots render via Remotion, free
}

function snapDuration(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  const fallback = config.shot.defaultSeconds;
  const allowed = [...providerLimits.video.allowedDurationsS];
  const target = Number.isFinite(n) && n > 0 ? n : fallback;
  return allowed.reduce((best, d) =>
    Math.abs(d - target) < Math.abs(best - target) || (Math.abs(d - target) === Math.abs(best - target) && d > best) ? d : best
  );
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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
        if (a && (a.template === "title" || a.template === "kinetic") && typeof a.text === "string" && a.text.trim()) {
          return { animation: { template: a.template as "title" | "kinetic", text: a.text.trim(), ...(typeof a.subtext === "string" && a.subtext.trim() ? { subtext: a.subtext.trim() } : {}) } };
        }
        return {};
      })(),
    });
  }
  return out;
}
