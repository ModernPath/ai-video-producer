// REQ-GEN-007 / BR-GEN-001 — the only model resolution path; ids live in shared config.
import { modelRoutes, type FrameQuality, type GenerationKind } from "@avd/shared/config";

export function resolveModel(kind: GenerationKind, quality: FrameQuality = "standard"): string {
  if (kind === "frame" || kind === "image_edit") return modelRoutes[kind][quality];
  return modelRoutes[kind];
}
