import { describe, expect, it } from "vitest";
import { parseSectionTimes, suggestSyncDurations } from "../src/music-sync";

describe("REQ-STB-025: lyric-synced cut suggestions", () => {
  it("parses section boundary times from a transcript (skips 00:00)", () => {
    const t = "[00:00] [Intro]\n[00:19] [Verse 1]\n[00:36] [Chorus]\n[02:32] [Outro]";
    expect(parseSectionTimes(t)).toEqual([19, 36, 152]);
  });

  it("suggests duration changes that land cuts on section boundaries", () => {
    // sections at 8s and 20s; three 6s shots cut at 6,12,18 — better: 8s,6s,6s cuts at 8,14,20
    const shots = [
      { id: "a", title: "A", durationS: 6 },
      { id: "b", title: "B", durationS: 6 },
      { id: "c", title: "C", durationS: 6 },
    ];
    const out = suggestSyncDurations(shots, [8, 20]);
    expect(out.suggestions).toEqual([
      { shotId: "a", title: "A", fromS: 6, toS: 8, boundaryS: 8 },
    ]);
    // applying the suggestion makes later cuts land: 8, 14, 20 — b/c unchanged
  });

  it("suggests nothing when cuts already align or no boundary is reachable", () => {
    const shots = [{ id: "a", title: "A", durationS: 8 }];
    expect(suggestSyncDurations(shots, [8]).suggestions).toEqual([]);
    expect(suggestSyncDurations(shots, [100]).suggestions).toEqual([]);
  });
});
