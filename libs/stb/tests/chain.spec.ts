import { describe, expect, it } from "vitest";
import { chainFor, chainOrder, generationBlocker, type ChainShot } from "../src/chain";

// USER 2026-07-27, on continuity chains: "so we can see the dependency and CONTINUE AS THE VIDEO
// FOR FIRST IS GENERATED."
//
// A chained shot generated before its source has no start frame to start from — the take is bought,
// the chain is silently defeated, and the money is gone. Order is part of the feature, not a detail.
const shots = (rows: Array<[string, string | null]>): ChainShot[] =>
  rows.map(([id, from], i) => ({ id, title: id, position: i + 1, continuesFromShotId: from, selectedTakeId: null }));

describe("REQ-STB-055: a chain knows its own order", () => {
  it("walks a three-shot chain from its head", () => {
    const s = shots([["a", null], ["b", "a"], ["c", "b"]]);
    expect(chainOrder(s, "a").map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("finds the head from anywhere in the chain, so any shot can start it", () => {
    const s = shots([["a", null], ["b", "a"], ["c", "b"]]);
    expect(chainOrder(s, "c").map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(chainOrder(s, "b").map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("returns just the shot when nothing chains to or from it", () => {
    expect(chainOrder(shots([["a", null], ["b", null]]), "a").map((x) => x.id)).toEqual(["a"]);
  });

  it("ignores unrelated chains in the same film", () => {
    const s = shots([["a", null], ["b", "a"], ["x", null], ["y", "x"]]);
    expect(chainOrder(s, "b").map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("terminates on a corrupt cycle instead of looping forever", () => {
    const s: ChainShot[] = [
      { id: "a", title: "a", position: 1, continuesFromShotId: "b", selectedTakeId: null },
      { id: "b", title: "b", position: 2, continuesFromShotId: "a", selectedTakeId: null },
    ];
    expect(chainOrder(s, "a").length).toBeLessThanOrEqual(2);
  });

  it("reports the chain a shot belongs to, and its place in it", () => {
    const s = shots([["a", null], ["b", "a"], ["c", "b"]]);
    expect(chainFor(s, "b")).toMatchObject({ length: 3, index: 1, headId: "a" });
    expect(chainFor(s, "a")).toMatchObject({ length: 3, index: 0 });
  });

  it("says a lone shot is in no chain", () => {
    expect(chainFor(shots([["a", null]]), "a")).toBeNull();
  });
});

describe("REQ-STB-055: generating out of order is refused, with a reason", () => {
  it("blocks a shot whose source has no chosen take yet", () => {
    const s = shots([["a", null], ["b", "a"]]);
    expect(generationBlocker(s, "b")).toMatch(/Coffee|a\b/);
    expect(generationBlocker(s, "b")).toMatch(/take/i);
  });

  it("allows it once the source has one", () => {
    const s = shots([["a", null], ["b", "a"]]);
    s[0]!.selectedTakeId = "t-a";
    expect(generationBlocker(s, "b")).toBeNull();
  });

  it("never blocks the head of a chain — it is what unblocks the rest", () => {
    expect(generationBlocker(shots([["a", null], ["b", "a"]]), "a")).toBeNull();
  });

  it("never blocks an unchained shot", () => {
    expect(generationBlocker(shots([["a", null]]), "a")).toBeNull();
  });

  it("names the shot that is holding it up, not a generic message", () => {
    const s: ChainShot[] = [
      { id: "a", title: "Coffee Gesture", position: 1, continuesFromShotId: null, selectedTakeId: null },
      { id: "b", title: "Coffee Mug Lift", position: 2, continuesFromShotId: "a", selectedTakeId: null },
    ];
    expect(generationBlocker(s, "b")).toContain("Coffee Gesture");
  });
});
