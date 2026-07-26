import { describe, expect, it } from "vitest";
import { gradeShotGrammar, type GradedShot } from "../src/grammar";

// TASK-DIR-001 / SR-DIR-001+002 (EPIC-STB-001, USER 2026-07-26: "1-minute feature film … directed
// by Aki Kaurismäki, a bit humoristic"). docs/87 states the craft principles as prose inside prompt
// strings, so nothing could check whether a plan honoured them. These are those principles as
// executable rules — the language the Style Card compiler and the director's pass both speak.

const shot = (i: number, over: Partial<GradedShot> = {}): GradedShot => ({
  id: `s${i}`,
  title: `Shot ${i}`,
  durationS: 6,
  shotSize: "MS",
  angle: "eye",
  movement: "static",
  ...over,
});

describe("REQ-STB-041: shot grammar vocabulary", () => {
  it("grades a plan that already follows the principles with no notes", () => {
    const shots = [
      shot(1, { shotSize: "WS" }),
      shot(2, { shotSize: "CU" }),
      shot(3, { shotSize: "MW" }),
      shot(4, { shotSize: "CU", durationS: 8 }), // ends longest + calm
    ];
    expect(gradeShotGrammar(shots)).toEqual([]);
  });

  it("flags two identical compositions in a row (docs/87 principle 4: contrast cuts)", () => {
    const shots = [shot(1, { shotSize: "WS" }), shot(2, { shotSize: "WS" }), shot(3, { shotSize: "CU", durationS: 8 })];
    const notes = gradeShotGrammar(shots);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ rule: "contrast-cut", shotIds: ["s1", "s2"] });
    expect(notes[0]!.note).toMatch(/WS/);
  });

  it("treats a repeated size as fine when the angle breaks the repetition", () => {
    const shots = [
      shot(1, { shotSize: "WS", angle: "eye" }),
      shot(2, { shotSize: "WS", angle: "overhead" }),
      shot(3, { shotSize: "CU", durationS: 8 }),
    ];
    expect(gradeShotGrammar(shots).filter((n) => n.rule === "contrast-cut")).toEqual([]);
  });

  it("flags a final shot that is not the held ending (docs/87 principle 6)", () => {
    const shots = [shot(1, { durationS: 8, shotSize: "WS" }), shot(2, { durationS: 4, shotSize: "CU" })];
    const notes = gradeShotGrammar(shots);
    expect(notes.map((n) => n.rule)).toContain("held-ending");
    expect(notes.find((n) => n.rule === "held-ending")!.shotIds).toEqual(["s2"]);
  });

  it("accepts a graphic end-card as a held ending even when it is short", () => {
    const shots = [shot(1, { durationS: 8, shotSize: "WS" }), shot(2, { durationS: 4, shotSize: "CU", isAnimation: true })];
    expect(gradeShotGrammar(shots).filter((n) => n.rule === "held-ending")).toEqual([]);
  });

  it("flags movement that the style forbids (the anti-notes axis of a Style Card)", () => {
    const shots = [
      shot(1, { movement: "static" }),
      shot(2, { movement: "push-in", shotSize: "CU" }),
      shot(3, { movement: "static", shotSize: "WS", durationS: 8 }),
    ];
    const notes = gradeShotGrammar(shots, { allowedMovements: ["static"] });
    expect(notes.map((n) => n.rule)).toContain("forbidden-movement");
    const n = notes.find((x) => x.rule === "forbidden-movement")!;
    expect(n.shotIds).toEqual(["s2"]);
    expect(n.note).toMatch(/push-in/);
  });

  it("flags durations outside the style's window (Kaurismäki: long holds, not 4s cutting)", () => {
    const shots = [
      shot(1, { durationS: 4 }),
      shot(2, { durationS: 8, shotSize: "CU" }),
      shot(3, { durationS: 8, shotSize: "WS" }),
    ];
    const notes = gradeShotGrammar(shots, { durationWindowS: [6, 8] });
    const n = notes.find((x) => x.rule === "duration-window")!;
    expect(n.shotIds).toEqual(["s1"]);
    expect(n.note).toMatch(/6–8s/);
  });

  it("flags a shot whose action fights itself (docs/87 principle 2: one idea per shot)", () => {
    const shots = [
      shot(1, { action: "she pours the coffee and then walks out to the harbour and lights a cigarette" }),
      shot(2, { shotSize: "CU", durationS: 8 }),
    ];
    const notes = gradeShotGrammar(shots);
    expect(notes.map((n) => n.rule)).toContain("one-idea");
    expect(notes.find((n) => n.rule === "one-idea")!.shotIds).toEqual(["s1"]);
  });

  it("counts shot-size coverage so a monotonous plan is visible at a glance", () => {
    const shots = [shot(1), shot(2, { shotSize: "MS" }), shot(3, { shotSize: "MS", durationS: 8 })];
    const notes = gradeShotGrammar(shots);
    expect(notes.map((n) => n.rule)).toContain("coverage");
    expect(notes.find((n) => n.rule === "coverage")!.note).toMatch(/only one shot size/i);
  });

  it("returns notes ordered by severity so the worst reads first", () => {
    const shots = [
      shot(1, { shotSize: "WS", movement: "handheld" }),
      shot(2, { shotSize: "WS", movement: "handheld" }),
      shot(3, { shotSize: "WS", durationS: 2, movement: "handheld" }),
    ];
    const notes = gradeShotGrammar(shots, { allowedMovements: ["static"], durationWindowS: [6, 8] });
    const sev = notes.map((n) => n.severity);
    expect(sev).toEqual([...sev].sort((a, b) => (a === "error" ? -1 : b === "error" ? 1 : 0)));
    expect(notes.length).toBeGreaterThan(2);
  });

  it("says nothing about a single-shot film beyond what applies", () => {
    expect(gradeShotGrammar([shot(1, { durationS: 8 })])).toEqual([]);
  });
});
