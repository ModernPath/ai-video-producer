// REQ-GEN-003 / INV-GEN-003 — cost derives from the shared price table, never inline rates.
import { config, omniVideoModel, priceTable, shotDurationPolicy, type FrameQuality, type GenerationKind } from "@avd/shared/config";

export interface CostOpts {
  durationSeconds?: number;
  quality?: FrameQuality;
  mock?: boolean;
  /** REQ-GEN-023: routes with different billing (omni = per video token) pass the model id. */
  model?: string;
}

export function computeCostUsd(kind: GenerationKind, opts: CostOpts = {}): number {
  if (opts.mock) return 0;
  switch (kind) {
    case "take":
    case "retake":
      if (opts.model === omniVideoModel) {
        return ((opts.durationSeconds ?? 0) * priceTable.omniVideoTokensPerSecond * priceTable.omniVideoUsdPerMTokens) / 1_000_000;
      }
      return (opts.durationSeconds ?? 0) * priceTable.videoPerSecondUsd;
    case "frame":
    case "image_edit":
      return priceTable.imagePerImageUsd[opts.quality ?? "standard"];
    case "music":
      return priceTable.musicPerTrackUsd; // REQ-GEN-019: per-song
    case "animation":
      return 0; // REQ-ANM-001: rendered locally
    default:
      return 0; // text kinds: negligible; metered later (BACKLOG price-table item)
  }
}

/**
 * REQ-STB-030 — what a take for this shot duration will ACTUALLY run and cost on the active
 * route: veo snaps to its discrete palette (ties up), omni clamps free-form to the cap.
 * The UI must show this instead of re-deriving snap math (split-brain found 2026-07-24:
 * a 10s omni shot advertised the veo-snapped "$0.80" while $1.01 was billed).
 */
export function estimateTake(durationS: number): { effectiveSeconds: number; usd: number } {
  const policy = shotDurationPolicy();
  const effectiveSeconds =
    config.gen.videoRoute === "omni"
      ? Math.min(Math.max(durationS, policy.minSeconds), policy.maxSeconds)
      : policy.allowedS.reduce((best, d) =>
          Math.abs(d - durationS) < Math.abs(best - durationS) || (Math.abs(d - durationS) === Math.abs(best - durationS) && d > best) ? d : best);
  const usd = computeCostUsd("take", {
    durationSeconds: effectiveSeconds,
    ...(config.gen.videoRoute === "omni" ? { model: omniVideoModel } : {}),
  });
  return { effectiveSeconds, usd };
}
