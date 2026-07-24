/**
 * Model routing config — versioned, single source of truth (BR-GEN-001).
 * docs/82-tech-stack.md §2. No model id literals anywhere else in the codebase.
 */
export const MODEL_CONFIG_VERSION = 1;

export type GenerationKind =
  | "script"
  | "shot_plan"
  | "direction"
  | "frame"
  | "image_edit"
  | "take"
  | "retake"
  | "music_brief"
  | "music" // REQ-GEN-019: Lyria track from the brief
  | "animation" // REQ-ANM-001: local Remotion render (free)
  | "transcript"; // REQ-GEN-020: MM:SS audio transcription

export type FrameQuality = "draft" | "standard" | "hero";

export const modelRoutes: Record<Exclude<GenerationKind, "frame" | "image_edit">, string> & {
  frame: Record<FrameQuality, string>;
  image_edit: Record<FrameQuality, string>;
} = {
  script: "gemini-3.6-flash",
  shot_plan: "gemini-3.6-flash",
  direction: "gemini-3.6-flash",
  music_brief: "gemini-3.6-flash",
  music: "lyria-3-pro-preview", // full song ~2min, $0.08 (OQ-114 resolved 2026-07-23)
  animation: "remotion-local", // engine id, not a provider model — renders in-process
  transcript: "gemini-3.6-flash", // audio understanding (docs/85 §Music)
  frame: {
    draft: "gemini-3.1-flash-lite-image",
    standard: "gemini-3.1-flash-image",
    hero: "gemini-3-pro-image",
  },
  image_edit: {
    draft: "gemini-3.1-flash-lite-image",
    standard: "gemini-3.1-flash-image",
    hero: "gemini-3-pro-image",
  },
  // Spike 2026-07-23: gemini-omni-flash-preview only serves the (SDK-unwrapped) Interactions
  // API; the generateVideos path is served by the Veo 3.1 family on the same key. Route takes
  // to veo-3.1-fast until the Omni Interactions adapter lands (OQ-112). Native audio included.
  take: "veo-3.1-fast-generate-preview",
  retake: "veo-3.1-fast-generate-preview",
};

/**
 * REQ-GEN-023 / OQ-112 (resolved 2026-07-24): the Omni Interactions video route.
 * Alternative to Veo for takes — reference conditioning via <IMAGE_REF_N>, first-frame lock
 * via <FIRST_FRAME>, free-form durations (10s verified). Selected via config.gen.videoRoute.
 */
export const omniVideoModel = "gemini-omni-flash-preview";

/** Provider price table (USD) — INV-GEN-003 cost recording derives from these. */
export const priceTable = {
  musicPerTrackUsd: 0.08, // lyria-3-pro-preview per song
  // Omni video billing is token-based and deterministic (spike 2026-07-24):
  // 5,792 video tokens per output second × $17.50/M ≈ $0.101/s — Veo-fast parity.
  omniVideoTokensPerSecond: 5792,
  omniVideoUsdPerMTokens: 17.5,
  // Veo 3.1 Fast (current take route): $0.15/s verified 2026-07-23 (was $0.10 Omni placeholder
  // — a 50% under-record on real takes, caught by triage). Per-model price map when routes multiply.
  videoPerSecondUsd: 0.1, // 720p rate per pricing page 2026-07-23 (was 0.15 — overestimated)
  // Per-image USD, verified 2026-07-23 (Google API pricing: ~$0.067 @1K standard,
  // $0.034 draft/batch tier, ~$0.15 high-res pro). Triage note: earlier draft mis-encoded
  // these as per-1000-images — a 1000x cost under-report. BACKLOG item closed.
  imagePerImageUsd: { draft: 0.034, standard: 0.067, hero: 0.15 },
} as const;

/** Provider capability facts the domain depends on (docs/00 §3 — re-verify per phase). */
export const providerLimits = {
  // Veo 3.1 (default take route): durations 4–8s, even values (spike 2026-07-23).
  video: { maxClipSeconds: 8, allowedDurationsS: [4, 6, 8] as const, aspectRatios: ["16:9", "9:16"] as const, maxReferenceImages: 3 },
  // Omni Interactions route (REQ-GEN-023): free-form durations, 10s verified 2026-07-24.
  omniVideo: { maxClipSeconds: 10 },
  image: { maxReferenceImages: 14, entityConsistencyRefs: 5 },
} as const;
