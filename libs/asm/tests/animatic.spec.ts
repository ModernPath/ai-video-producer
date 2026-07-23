import { describe, expect, it } from "vitest";
import { buildCues, cueAtTime } from "../src/animatic";

// REQ-ASM-009 — animatic timing math (pure).
describe("REQ-ASM-009: animatic cues", () => {
  const shots = [
    { id: "a", durationS: 6, frameAssetId: "f1", title: "one" },
    { id: "b", durationS: 5, frameAssetId: "f2", title: "two" },
    { id: "c", durationS: 6, frameAssetId: "f3", title: "three" },
  ];

  it("builds offsets and total", () => {
    const cues = buildCues(shots);
    expect(cues.total).toBe(17);
    expect(cues.items.map((c) => c.startS)).toEqual([0, 6, 11]);
  });

  it("maps time to the active cue, clamping at the end", () => {
    const cues = buildCues(shots);
    expect(cueAtTime(cues, 0)?.title).toBe("one");
    expect(cueAtTime(cues, 7.2)?.title).toBe("two");
    expect(cueAtTime(cues, 11)?.title).toBe("three");
    expect(cueAtTime(cues, 16.99)?.title).toBe("three");
    expect(cueAtTime(cues, 17)).toBeNull(); // finished
    expect(cueAtTime(cues, -1)?.title).toBe("one");
  });

  it("skips shots without any frame", () => {
    const cues = buildCues([...shots, { id: "d", durationS: 4, frameAssetId: null, title: "empty" }]);
    expect(cues.items.length).toBe(3);
    expect(cues.skipped).toEqual(["empty"]);
  });
});
