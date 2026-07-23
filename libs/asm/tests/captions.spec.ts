import { describe, expect, it } from "vitest";
import { transcriptToSrt } from "../src/captions";

const TRANSCRIPT = `[00:00] [Intro]
[00:05] [Verse] first line of the song
[00:12] [Chorus] hands up to the light
[00:20] [Outro]`;

describe("REQ-ASM-009: transcript → SRT for burned captions", () => {
  it("each line runs from its stamp to the next; last line capped by total duration", () => {
    const srt = transcriptToSrt(TRANSCRIPT, 24);
    expect(srt).toContain("1\n00:00:00,000 --> 00:00:05,000\n[Intro]");
    expect(srt).toContain("2\n00:00:05,000 --> 00:00:12,000\nfirst line of the song");
    expect(srt).toContain("3\n00:00:12,000 --> 00:00:20,000\nhands up to the light");
    expect(srt).toContain("4\n00:00:20,000 --> 00:00:24,000\n[Outro]");
  });

  it("drops section-only labels when asked for lyrics only, keeps lyric text", () => {
    const srt = transcriptToSrt(TRANSCRIPT, 24, { lyricsOnly: true });
    expect(srt).not.toContain("[Intro]");
    expect(srt).toContain("first line of the song");
  });

  it("returns empty string for unparseable input", () => {
    expect(transcriptToSrt("no timestamps here", 10)).toBe("");
  });

  it("lines past the video duration are dropped", () => {
    const srt = transcriptToSrt(TRANSCRIPT, 10);
    expect(srt).toContain("first line of the song");
    expect(srt).not.toContain("hands up to the light");
  });
});
