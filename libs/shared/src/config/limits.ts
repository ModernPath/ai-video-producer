/**
 * Product configuration — versioned; the only home for thresholds and defaults
 * (root CLAUDE.md non-negotiable 4: configuration values are never literals).
 */
import { providerLimits } from "./models";

export const config = {
  platform: {
    devOrgName: "Local Studio", // single-tenant dev org until PLT auth lands; resolution must be by name, deterministic
  },
  shot: {
    minSeconds: 4,
    maxSeconds: 8, // must never exceed providerLimits.video.maxClipSeconds (INV-STB-001; Veo 3.1 route)
    defaultSeconds: 6,
  },
  frame: { candidatesDefault: 2, candidatesMax: 4 },
  derivative: { thumbWidth: 320, jpegQuality: 4 }, // BR-AST-002: ffmpeg -q:v scale (2 best .. 31 worst)
  entity: { maxRefs: providerLimits.image.entityConsistencyRefs }, // INV-AST-004
  gen: {
    maxConcurrentVideoPerOrg: 3, // BR-GEN-005
    retryAttempts: 3,
    // INV-GEN-004: daily per-org spend cap; env-overridable for ops without a deploy
    quota: { dailyUsdPerOrg: Number(process.env.GEN_DAILY_USD_CAP ?? 20) }, // raised 5→20 (USER 2026-07-23: "up to 20 dollars to testing")
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
