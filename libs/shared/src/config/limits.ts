/**
 * Product configuration — versioned; the only home for thresholds and defaults
 * (root CLAUDE.md non-negotiable 4: configuration values are never literals).
 */
import { providerLimits } from "./models";

/** The entity kinds the cast model supports — mirrored by `ast.entity.kind` (REQ-STB-048). */
export const entityKinds = ["company", "product", "person", "character"] as const;
export type EntityKind = (typeof entityKinds)[number];

export const config = {
  platform: {
    devOrgName: "Local Studio", // single-tenant dev org until PLT auth lands; resolution must be by name, deterministic
  },
  shot: {
    /** REQ-STB-050: unhurried delivery — the plan budgets dialogue against this. */
    wordsPerSecond: 2.5,
    minSeconds: 4,
    maxSeconds: 8, // must never exceed providerLimits.video.maxClipSeconds (INV-STB-001; Veo 3.1 route)
    defaultSeconds: 6,
  },
  frame: { candidatesDefault: 2, candidatesMax: 4 },
  derivative: { thumbWidth: 320, jpegQuality: 4 }, // BR-AST-002: ffmpeg -q:v scale (2 best .. 31 worst)
  entity: { maxRefs: providerLimits.image.entityConsistencyRefs, profilePromptMaxChars: 1500 }, // INV-AST-004 · REQ-AST-012 cap keeps text prompts lean
  gen: {
    maxConcurrentVideoPerOrg: 3, // BR-GEN-005
    // REQ-GEN-023: take/retake provider route — "omni" switches to the Interactions adapter
    // (refs + free durations); env-tunable for taste iteration without a deploy.
    videoRoute: (process.env.GEN_VIDEO_ROUTE === "omni" ? "omni" : "veo") as "veo" | "omni",
    retryAttempts: 3,
    staleRunningMinutes: 30, // REQ-GEN-022: running longer than this = orphaned (crash mid-run)
    // INV-GEN-004: daily per-org spend cap; env-overridable for ops without a deploy
    quota: { dailyUsdPerOrg: Number(process.env.GEN_DAILY_USD_CAP ?? 100) }, // raised 20→100 (USER 2026-07-24: "you get 100 dollars for today")
  },
  audio: { duckDb: -12, fadeOutSeconds: 2, lufsTarget: -14 }, // BR-ASM-001..003
  asm: {
    captions: {
      // host font mounted into the alpine ffmpeg container (no fonts baked in)
      fontFile: process.env.CAPTION_FONT_FILE ?? "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
      style: "FontName=Arial Bold,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,Outline=2,MarginV=28",
    },
    maxConcurrentExportsPerOrg: 2,
    // BR-ASM-003 output profile (per aspect ratio); bump to 1080p when real takes warrant
    normalize: {
      "16:9": { width: 1280, height: 720 },
      "9:16": { width: 720, height: 1280 },
      fps: 24,
      audioHz: 48000,
    },
    // INV-ASM-005 share tokens: 24 random bytes → 32 base64url chars (≥ 32-char floor)
    share: { tokenBytes: 24 },
  },
  project: {
    defaultAspectRatio: "16:9" as const,
    defaultTargetDurationSeconds: 30,
    defaultResolutionTier: "1080p" as const,
    // REQ-PRJ-006: a runtime read out of the user's own prompt is honoured only inside this range —
    // shorter than one shot, or longer than the product can assemble, was not a runtime request.
    minTargetSeconds: 5,
    maxTargetSeconds: 300,
  },
  quota: { defaultUsdPerMonth: 50 }, // BR-PLT-002
  upload: {
    maxImageBytes: 25 * 1024 * 1024,
    clientResize: { maxEdgePx: 2048, jpegQuality: 0.85 }, // REQ-AST-009 browser-side shrink
    maxAudioBytes: 100 * 1024 * 1024,
    imageMimes: ["image/png", "image/jpeg", "image/webp"],
    audioMimes: ["audio/mpeg", "audio/wav", "audio/x-wav"],
  },
} as const;

/**
 * REQ-STB-029 — the shot-duration policy follows the active video route (REQ-GEN-023).
 * Veo: discrete {4,6,8}s, cap 8 (INV-STB-001). Omni: every integer second from shot.minSeconds
 * to the omni clip cap (10s verified 2026-07-24). Read at call time — tests flip the route.
 */
export function shotDurationPolicy(): { minSeconds: number; maxSeconds: number; allowedS: number[] } {
  if (config.gen.videoRoute === "omni") {
    const maxSeconds = providerLimits.omniVideo.maxClipSeconds;
    const allowedS: number[] = [];
    for (let d = config.shot.minSeconds; d <= maxSeconds; d++) allowedS.push(d);
    return { minSeconds: config.shot.minSeconds, maxSeconds, allowedS };
  }
  return { minSeconds: config.shot.minSeconds, maxSeconds: config.shot.maxSeconds, allowedS: [...providerLimits.video.allowedDurationsS] };
}

/**
 * REQ-ANM-006 / REQ-STB-036 — the full-frame animation template set. Single source of truth
 * for the plan schema, normalization, executor dispatch, and the UI picker; adding a template
 * here (plus its ANM composition) makes it choosable everywhere.
 */
export const fullFrameAnimationTemplates = ["title", "kinetic", "stat", "quote", "checklist"] as const;
export type FullFrameAnimationTemplate = (typeof fullFrameAnimationTemplates)[number];
