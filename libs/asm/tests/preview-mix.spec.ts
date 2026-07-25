import { describe, expect, it } from "vitest";
import { config } from "@avd/shared/config";
import { previewMix } from "../src/preview";

// REQ-ASM-014 (USER 2026-07-25): "how do I play the audio within one clip? … can't play the video
// with the audio (only the videos own audio track, not external music)".
// Previewing one clip must sound like the export will: the same mix rule (BR-ASM-001/002), and the
// bed must start at the clip's own position in the cut, not at 0:00.
describe("REQ-ASM-014: a clip preview mixes like the export", () => {
  it("music mode replaces the take's audio with the track at full level", () => {
    const m = previewMix({ mixMode: "music", hasTrack: true });
    expect(m).toEqual({ bed: true, videoVolume: 0, bedVolume: 1 });
  });

  it("mix mode keeps the take audio and ducks the bed by the configured dB", () => {
    const m = previewMix({ mixMode: "mix", hasTrack: true });
    expect(m.bed).toBe(true);
    expect(m.videoVolume).toBe(1);
    expect(m.bedVolume).toBeCloseTo(Math.pow(10, config.audio.duckDb / 20), 4);
  });

  it("native mode plays only the take — no bed", () => {
    expect(previewMix({ mixMode: "native", hasTrack: true })).toEqual({ bed: false, videoVolume: 1, bedVolume: 0 });
  });

  it("no attached track means no bed, whatever the mode says", () => {
    expect(previewMix({ mixMode: "music", hasTrack: false }).bed).toBe(false);
    expect(previewMix({ mixMode: "music", hasTrack: false }).videoVolume).toBe(1);
  });

  // The user can force the bed on to audition a native-mode clip against the music.
  it("an explicit bed override adds the ducked track over native audio", () => {
    const m = previewMix({ mixMode: "native", hasTrack: true, force: true });
    expect(m.bed).toBe(true);
    expect(m.videoVolume).toBe(1);
    expect(m.bedVolume).toBeCloseTo(Math.pow(10, config.audio.duckDb / 20), 4);
  });

  it("an override cannot invent a bed without a track", () => {
    expect(previewMix({ mixMode: "native", hasTrack: false, force: true }).bed).toBe(false);
  });
});
