// REQ-ASM-014 — the mix rule for previewing a single clip, shared with the export path so the
// editor sounds like the render (BR-ASM-001/002). USER 2026-07-25: "how do I play the audio within
// one clip? … can't play the video with the audio (only the videos own audio track, not external
// music)". The player pairs this with the clip's start offset so the bed comes in at the right bar.
import { config } from "@avd/shared/config";

export type MixMode = "native" | "music" | "mix";

export interface PreviewMix {
  /** Play the project track under the clip. */
  bed: boolean;
  /** Gain for the take's own audio (0 = replaced by the track). */
  videoVolume: number;
  /** Gain for the track (ducked in `mix`, as the exporter ducks it). */
  bedVolume: number;
}

/** Linear gain for the configured duck (exporter uses the same 10^(dB/20)). */
const duckLinear = () => Math.pow(10, config.audio.duckDb / 20);

export function previewMix(input: { mixMode: MixMode; hasTrack: boolean; force?: boolean }): PreviewMix {
  if (!input.hasTrack) return { bed: false, videoVolume: 1, bedVolume: 0 }; // never claim a bed we don't have
  if (input.mixMode === "music") return { bed: true, videoVolume: 0, bedVolume: 1 };
  if (input.mixMode === "mix" || input.force) return { bed: true, videoVolume: 1, bedVolume: duckLinear() };
  return { bed: false, videoVolume: 1, bedVolume: 0 };
}
