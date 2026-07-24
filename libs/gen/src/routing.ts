// REQ-GEN-007 / BR-GEN-001 — the only model resolution path; ids live in shared config.
import { config, modelRoutes, omniVideoModel, type FrameQuality, type GenerationKind } from "@avd/shared/config";

export function resolveModel(kind: GenerationKind, quality: FrameQuality = "standard"): string {
  if (kind === "frame" || kind === "image_edit") return modelRoutes[kind][quality];
  // REQ-GEN-023: the video route is an ops/taste switch, read at call time (tests mutate config).
  if ((kind === "take" || kind === "retake") && config.gen.videoRoute === "omni") return omniVideoModel;
  return modelRoutes[kind];
}
