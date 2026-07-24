// REQ-GEN-003 / INV-GEN-003 — cost derives from the shared price table, never inline rates.
import { omniVideoModel, priceTable, type FrameQuality, type GenerationKind } from "@avd/shared/config";

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
