/**
 * Product configuration — versioned; the only home for thresholds and defaults
 * (root CLAUDE.md non-negotiable 4: configuration values are never literals).
 */
import { providerLimits } from "./models";

export const config = {
  shot: {
    minSeconds: 4,
    maxSeconds: 8, // must never exceed providerLimits.video.maxClipSeconds (INV-STB-001; Veo 3.1 route)
    defaultSeconds: 6,
  },
  frame: { candidatesDefault: 2, candidatesMax: 4 },
  entity: { maxRefs: providerLimits.image.entityConsistencyRefs }, // INV-AST-004
  gen: { maxConcurrentVideoPerOrg: 3, retryAttempts: 3 }, // BR-GEN-005
  audio: { duckDb: -12, fadeOutSeconds: 2, lufsTarget: -14 }, // BR-ASM-001..003
  asm: {
    maxConcurrentExportsPerOrg: 2,
    // BR-ASM-003 output profile (per aspect ratio); bump to 1080p when real takes warrant
    normalize: {
      "16:9": { width: 1280, height: 720 },
      "9:16": { width: 720, height: 1280 },
      fps: 24,
      audioHz: 48000,
    },
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
