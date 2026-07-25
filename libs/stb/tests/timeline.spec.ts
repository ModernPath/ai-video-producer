import { describe, expect, it } from "vitest";
import { buildTimeline } from "../src/timeline";

// REQ-STB-039 (USER 2026-07-25): "it would be nice to see the music timing within the clips, like
// traditional video editors do? Because if I e.g. add new clip, it might outsync the video."
const track = 39;

describe("REQ-STB-039: clips laid out on the track's time axis", () => {
  it("gives every shot its start/end on the timeline", () => {
    const t = buildTimeline({
      shots: [
        { id: "a", title: "A", durationS: 6 },
        { id: "b", title: "B", durationS: 4 },
      ],
      sectionTimesS: [],
      trackDurationS: null,
    });
    expect(t.blocks.map((b) => [b.startS, b.endS])).toEqual([[0, 6], [6, 10]]);
    expect(t.cutDurationS).toBe(10);
  });

  it("marks the cuts that land exactly on a music section change", () => {
    const t = buildTimeline({
      shots: [
        { id: "a", title: "A", durationS: 6 },
        { id: "b", title: "B", durationS: 4 },
      ],
      sectionTimesS: [6, 19],
      trackDurationS: track,
    });
    expect(t.blocks[0]!.onBoundary).toBe(true);  // cut at 0:06 == section change
    expect(t.blocks[1]!.onBoundary).toBe(false); // cut at 0:10 is mid-section
  });

  // The user's exact worry: a new clip early on pushes every later cut off the beat.
  it("inserting a clip desyncs the later cuts", () => {
    const before = buildTimeline({
      shots: [{ id: "a", title: "A", durationS: 6 }, { id: "b", title: "B", durationS: 13 }],
      sectionTimesS: [6, 19],
      trackDurationS: track,
    });
    expect(before.blocks.every((b) => b.onBoundary)).toBe(true);

    const after = buildTimeline({
      shots: [
        { id: "a", title: "A", durationS: 6 },
        { id: "new", title: "New", durationS: 4 },
        { id: "b", title: "B", durationS: 13 },
      ],
      sectionTimesS: [6, 19],
      trackDurationS: track,
    });
    expect(after.blocks[0]!.onBoundary).toBe(true);
    expect(after.blocks[2]!.onBoundary).toBe(false); // B now cuts at 0:23, not 0:19
    expect(after.desyncedCount).toBe(2);
  });
});

describe("REQ-STB-039: drift against the attached track", () => {
  it("reports leftover track when the cut is shorter", () => {
    const t = buildTimeline({ shots: [{ id: "a", title: "A", durationS: 30 }], sectionTimesS: [], trackDurationS: track });
    expect(t.driftS).toBe(-9); // 9s of track unused
  });
  it("reports overrun when the cut runs past the track", () => {
    const t = buildTimeline({ shots: [{ id: "a", title: "A", durationS: 45 }], sectionTimesS: [], trackDurationS: track });
    expect(t.driftS).toBe(6);
  });
  it("has no drift without a track", () => {
    const t = buildTimeline({ shots: [{ id: "a", title: "A", durationS: 8 }], sectionTimesS: [], trackDurationS: null });
    expect(t.driftS).toBeNull();
  });
});

// REQ-STB-040: shortening a shot is a free crop (the export already trims with -t); lengthening
// past the take's real footage is not — the UI must say which one you are about to do.
describe("REQ-STB-040: crop vs regenerate per shot", () => {
  it("a shot shorter than its take crops for free in the export", () => {
    const t = buildTimeline({
      shots: [{ id: "a", title: "A", durationS: 4, takeActualS: 6 }],
      sectionTimesS: [], trackDurationS: null,
    });
    expect(t.blocks[0]!.trimmedS).toBe(2);
    expect(t.blocks[0]!.shortfallS).toBe(0);
  });
  it("a shot longer than its take is short of footage", () => {
    const t = buildTimeline({
      shots: [{ id: "a", title: "A", durationS: 8, takeActualS: 6 }],
      sectionTimesS: [], trackDurationS: null,
    });
    expect(t.blocks[0]!.shortfallS).toBe(2);
    expect(t.blocks[0]!.trimmedS).toBe(0);
  });
  it("a shot with no take reports neither", () => {
    const t = buildTimeline({ shots: [{ id: "a", title: "A", durationS: 8 }], sectionTimesS: [], trackDurationS: null });
    expect(t.blocks[0]!.shortfallS).toBe(0);
    expect(t.blocks[0]!.trimmedS).toBe(0);
  });
});
