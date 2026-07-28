// REQ-STB-032 / ADR-013 — music-led films plan against the REAL track.
//
// USER 2026-07-28: "the only way to nail it is to get the actual transcript and timestamps of the
// music BEFORE we generate any videoclips and the plan should then correctly sync the lyrics/videos
// with audio."
//
// Neon Rivers (2026-07-24) put verse text on screen at ~8s while the vocals started at 0:23. The
// planner already RECEIVES the transcript (REQ-STB-028) — what was missing is that nothing made the
// track exist first, so on a fresh project the transcript is simply absent and the plan is made
// blind. This is that gate, and it is pure: no database, no model.
import { describe, expect, it } from "vitest";
import { cardFor, isMusicLed, musicLedPlanBlocker } from "../src/music-led";

const lyricCard = { defaults: { audioMode: "music" as const } };
const brandCard = { defaults: { audioMode: "mix" as const } };

describe("REQ-STB-032: which projects are music-led", () => {
  it("a card whose audio mode is music is music-led", () => {
    expect(isMusicLed(lyricCard)).toBe(true);
  });

  it("a card that only beds music under narration is NOT — its pictures lead", () => {
    expect(isMusicLed(brandCard)).toBe(false);
  });

  it("no card at all is not music-led — planning stays ungated", () => {
    expect(isMusicLed(undefined)).toBe(false);
  });

  it("the compiled card wins over the archetype, exactly as everywhere else", () => {
    // ADR-013 forbids a second copy of this rule; cardFor is the one resolver (CLAUDE.md §1.11).
    const card = cardFor({ archetype: "lyric-video", styleCard: { ...MINIMAL_CARD, defaults: { audioMode: "native" } } });
    expect(card?.defaults?.audioMode).toBe("native");
  });

  it("falls back to the archetype when no card is compiled", () => {
    expect(cardFor({ archetype: "lyric-video", styleCard: null })?.id).toBe("lyric-video");
  });
});

describe("REQ-STB-032: a music-led plan is blocked until the track is real", () => {
  it("refuses when there is no track, and names how to get one", () => {
    const why = musicLedPlanBlocker({ isMusicLed: true, hasTrack: false, hasTranscript: false });
    expect(why).toMatch(/track/i);
    expect(why, "REQ-GEN-027 shape: name the way out, not just the problem").toMatch(/generate|attach/i);
  });

  it("refuses when the track exists but has not been transcribed", () => {
    const why = musicLedPlanBlocker({ isMusicLed: true, hasTrack: true, hasTranscript: false });
    expect(why).toMatch(/transcri/i);
  });

  it("allows planning once the track is transcribed", () => {
    expect(musicLedPlanBlocker({ isMusicLed: true, hasTrack: true, hasTranscript: true })).toBeNull();
  });

  it("never blocks a project that is not music-led — the old order still applies", () => {
    expect(musicLedPlanBlocker({ isMusicLed: false, hasTrack: false, hasTranscript: false })).toBeNull();
  });
});

// The card shape the schema requires; only `defaults` matters to these tests.
const MINIMAL_CARD = {
  id: "test", name: "Test", provenance: { references: [] },
  structure: { arc: "a" },
  camera: { allowedMovements: ["static"], preferredSizes: ["MS"], angles: ["eye"], notes: "" },
  pacing: { durationWindowS: [4, 8] as [number, number] },
  palette: { accent: "#ff0000", background: "#000000", notes: "" },
  light: "", performance: "", humour: "", sound: "",
  typography: "", continuity: "", antiNotes: [],
};
