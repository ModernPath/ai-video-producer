import { describe, expect, it } from "vitest";
import { boardProgress, shotStatus } from "../src/board";

// REQ-STB-037 (USER 2026-07-25 UX review): the workspace rail shows every shot's state at a glance,
// so the status rule leaves the page markup and becomes one tested function.
describe("REQ-STB-037: board shot status", () => {
  it("a shot with a selected take is generated", () => {
    expect(shotStatus({ selectedTakeId: "t1", frameCount: 0 })).toBe("generated");
  });
  it("a shot with frames but no take is framed", () => {
    expect(shotStatus({ selectedTakeId: null, frameCount: 2 })).toBe("framed");
  });
  it("a shot with neither is planned", () => {
    expect(shotStatus({ selectedTakeId: null, frameCount: 0 })).toBe("planned");
  });
});

describe("REQ-STB-037: board progress drives the export affordance", () => {
  it("counts generated shots and reports ready when all are generated", () => {
    const p = boardProgress([{ selectedTakeId: "a" }, { selectedTakeId: "b" }]);
    expect(p).toEqual({ generated: 2, total: 2, ready: true, pending: [] });
  });
  it("lists the shots that would be skipped by an export", () => {
    const p = boardProgress([{ id: "s1", selectedTakeId: "a" }, { id: "s2", selectedTakeId: null }]);
    expect(p.generated).toBe(1);
    expect(p.ready).toBe(false);
    expect(p.pending).toEqual(["s2"]);
  });
  it("an empty board is never export-ready", () => {
    expect(boardProgress([])).toEqual({ generated: 0, total: 0, ready: false, pending: [] });
  });
});
