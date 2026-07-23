// REQ-GEN-003 / INV-GEN-003 — cost derives from the shared price table, never inline rates.
import { priceTable, type FrameQuality, type GenerationKind } from "@avd/shared/config";

export interface CostOpts {
  durationSeconds?: number;
  quality?: FrameQuality;
  mock?: boolean;
}

export function computeCostUsd(kind: GenerationKind, opts: CostOpts = {}): number {
  if (opts.mock) return 0;
  switch (kind) {
    case "take":
    case "retake":
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
