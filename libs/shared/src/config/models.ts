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
  take: "gemini-omni-flash-preview",
  retake: "gemini-omni-flash-preview",
};

/** Provider price table (USD) — INV-GEN-003 cost recording derives from these. */
export const priceTable = {
  videoPerSecondUsd: 0.1, // gemini-omni-flash-preview, announcement 2026 (docs/00 §3)
  imagePerThousandUsd: { draft: 0.034, standard: 0.3, hero: 1.2 }, // draft verified; others placeholder → BACKLOG
} as const;

/** Provider capability facts the domain depends on (docs/00 §3 — re-verify per phase). */
export const providerLimits = {
  video: { maxClipSeconds: 10, aspectRatios: ["16:9", "9:16"] as const, maxReferenceImages: 3 },
  image: { maxReferenceImages: 14, entityConsistencyRefs: 5 },
} as const;
