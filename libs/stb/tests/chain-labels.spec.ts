import { describe, expect, it } from "vitest";
import { chainLabels } from "../src/chain";
import type { ChainShot } from "../src/chain";

// USER 2026-07-27: "should we somehow indicate at timeline which clips are linked, e.g. with
// numbering, e.g. 4, 4.1, 4.2 etc or alignment."
//
// A chain is currently invisible until you focus a shot. Sub-numbering makes the dependency legible
// at a glance in both the rail and the timeline: 4 is the shot, 4.1 and 4.2 are its sub-clips.
const shots = (rows: Array<[string, string | null]>): ChainShot[] =>
  rows.map(([id, from], i) => ({ id, title: id, position: i + 1, continuesFromShotId: from, selectedTakeId: null }));

const labels = (s: ChainShot[]) => s.map((x) => chainLabels(s).get(x.id));

describe("REQ-STB-056: linked clips are numbered as sub-clips", () => {
  it("numbers an unchained film 1..n", () => {
    expect(labels(shots([["a", null], ["b", null], ["c", null]]))).toEqual(["1", "2", "3"]);
  });

  it("gives a chain's followers decimal sub-numbers", () => {
    expect(labels(shots([["a", null], ["b", null], ["c", null], ["d", null], ["e", "d"], ["f", "e"]])))
      .toEqual(["1", "2", "3", "4", "4.1", "4.2"]);
  });

  it("does not let sub-clips consume top-level numbers", () => {
    // 4, 4.1, 4.2 then the NEXT independent shot is 5 — not 7.
    expect(labels(shots([["a", null], ["b", null], ["c", null], ["d", null], ["e", "d"], ["f", "e"], ["g", null]])))
      .toEqual(["1", "2", "3", "4", "4.1", "4.2", "5"]);
  });

  it("handles two separate chains in one film", () => {
    expect(labels(shots([["a", null], ["b", "a"], ["c", null], ["d", null], ["e", "d"]])))
      .toEqual(["1", "1.1", "2", "3", "3.1"]);
  });

  it("numbers a chain that opens the film", () => {
    expect(labels(shots([["a", null], ["b", "a"], ["c", "b"]]))).toEqual(["1", "1.1", "1.2"]);
  });

  it("treats a follower whose source was cut as a top-level shot again", () => {
    const s = shots([["a", null], ["b", "missing"]]);
    expect(labels(s)).toEqual(["1", "2"]);
  });

  it("labels every shot exactly once", () => {
    const s = shots([["a", null], ["b", "a"], ["c", null]]);
    const map = chainLabels(s);
    expect(map.size).toBe(3);
    expect(new Set(map.values()).size).toBe(3);
  });
});
