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
  | "music_brief";

export type FrameQuality = "draft" | "standard" | "hero";

export const modelRoutes: Record<Exclude<GenerationKind, "frame" | "image_edit">, string> & {
  frame: Record<FrameQuality, string>;
  image_edit: Record<FrameQuality, string>;
} = {
  script: "gemini-3.6-flash",
  shot_plan: "gemini-3.6-flash",
  direction: "gemini-3.6-flash",
  music_brief: "gemini-3.6-flash",
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

/** Provider price table (USD) — INV-GEN-003 cost recording derives from these. */
export const priceTable = {
  videoPerSecondUsd: 0.1, // gemini-omni-flash-preview, announcement 2026 (docs/00 §3)
  // Per-image USD, verified 2026-07-23 (Google API pricing: ~$0.067 @1K standard,
  // $0.034 draft/batch tier, ~$0.15 high-res pro). Triage note: earlier draft mis-encoded
  // these as per-1000-images — a 1000x cost under-report. BACKLOG item closed.
  imagePerImageUsd: { draft: 0.034, standard: 0.067, hero: 0.15 },
} as const;

/** Provider capability facts the domain depends on (docs/00 §3 — re-verify per phase). */
export const providerLimits = {
  // Veo 3.1 (current take route): durations 4–8s, even values (spike 2026-07-23).
  // Omni restores 10s when its Interactions adapter lands (OQ-112).
  video: { maxClipSeconds: 8, allowedDurationsS: [4, 6, 8] as const, aspectRatios: ["16:9", "9:16"] as const, maxReferenceImages: 3 },
  image: { maxReferenceImages: 14, entityConsistencyRefs: 5 },
} as const;
