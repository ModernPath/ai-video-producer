import { describe, expect, it } from "vitest";
import { normalizePlannedShots } from "../src/plan-normalize";
import { assembleDirectorPassPrompt, reviewPlan } from "../src/director-pass";
import { styleCards } from "@avd/shared/config";
import type { StyleCard } from "@avd/shared/contracts";

// TASK-DIR-005 / SR-DIR-006 (EPIC-STB-001, USER 2026-07-26 "Director's pass would be quite cool").
// The plan is graded against the ACTIVE CARD before anything is generated, so the notes say "this
// film promised static frames and you planned three push-ins" rather than generic advice.

const card: StyleCard = { ...styleCards["cinematic-mood"]! }; // static/push-in only, 8s holds

const planned = (over: Record<string, unknown>[]) =>
  normalizePlannedShots({ shots: over });

describe("REQ-STB-043: the plan can state its own grammar", () => {
  it("normalizes shot size, angle and movement when the planner supplies them", () => {
    const [s] = planned([{ title: "A", durationS: 8, synopsis: "x", shotSize: "WS", angle: "eye", movement: "static" }]);
    expect(s!.grammar).toEqual({ shotSize: "WS", angle: "eye", movement: "static" });
  });

  it("reads them from the direction block too, where models often put them", () => {
    const [s] = planned([{ title: "A", durationS: 8, direction: { synopsis: "x", shotSize: "CU", angle: "low", movement: "push-in" } }]);
    expect(s!.grammar).toEqual({ shotSize: "CU", angle: "low", movement: "push-in" });
  });

  it("falls back to sane defaults rather than dropping the shot", () => {
    const [s] = planned([{ title: "A", durationS: 8, synopsis: "x" }]);
    expect(s!.grammar).toEqual({ shotSize: "MS", angle: "eye", movement: "static" });
  });

  it("drops vocabulary it does not recognise instead of trusting it", () => {
    const [s] = planned([{ title: "A", durationS: 8, synopsis: "x", shotSize: "SUPERWIDE", movement: "drone-orbit" }]);
    expect(s!.grammar.shotSize).toBe("MS");
    expect(s!.grammar.movement).toBe("static");
  });

  // A shot-plan proposal is STORED normalized, so anything that re-reads it (the director's pass,
  // the UI, an applied plan) runs normalize a second time. Found live 2026-07-26: a real plan with
  // WS/MS/MCU/MW/CU framing graded as six identical MS shots and produced five false contrast-cut
  // errors, because the second pass could not see the `grammar` it had written itself.
  it("is idempotent — re-normalizing its own output keeps the grammar", () => {
    const once = planned([{ title: "A", durationS: 8, synopsis: "x", shotSize: "MCU", angle: "low", movement: "pan" }]);
    const twice = normalizePlannedShots({ shots: once });
    expect(twice[0]!.grammar).toEqual({ shotSize: "MCU", angle: "low", movement: "pan" });
    expect(twice).toEqual(once);
  });

  it("accepts the long-form spellings a model naturally writes", () => {
    const [s] = planned([{ title: "A", durationS: 8, synopsis: "x", shotSize: "wide", movement: "Push In" }]);
    expect(s!.grammar.shotSize).toBe("WS");
    expect(s!.grammar.movement).toBe("push-in");
  });
});

describe("REQ-STB-043: the director's pass grades a plan against the active card", () => {
  const badPlan = planned([
    { title: "Harbour wide", durationS: 4, synopsis: "the quay", shotSize: "WS", angle: "eye", movement: "tracking" },
    { title: "Boats", durationS: 4, synopsis: "boats", shotSize: "WS", angle: "eye", movement: "handheld" },
    { title: "Logo", durationS: 4, synopsis: "logo", shotSize: "WS", angle: "eye", movement: "push-in" },
  ]);

  it("names the axis each shot violates, not generic advice", () => {
    const notes = reviewPlan(badPlan, card);
    const rules = notes.map((n) => n.rule);
    expect(rules).toContain("forbidden-movement"); // card allows static + push-in only
    expect(rules).toContain("duration-window");    // card holds 8s
    expect(rules).toContain("contrast-cut");       // three identical WS/eye framings
    expect(rules).toContain("coverage");
  });

  it("quotes the card's own window in the note, so the user sees what they asked for", () => {
    const note = reviewPlan(badPlan, card).find((n) => n.rule === "duration-window")!;
    expect(note.note).toMatch(/8–8s|8-8s/);
  });

  it("passes a plan that already honours the card", () => {
    const good = planned([
      { title: "Harbour", durationS: 8, synopsis: "quay", shotSize: "EWS", angle: "eye", movement: "static" },
      { title: "Nets", durationS: 8, synopsis: "nets", shotSize: "MW", angle: "high", movement: "push-in" },
      { title: "Dawn", durationS: 8, synopsis: "dawn", shotSize: "WS", angle: "eye", movement: "static" },
    ]);
    expect(reviewPlan(good, card)).toEqual([]);
  });

  it("grades against the universal principles when no card is selected", () => {
    const notes = reviewPlan(badPlan, undefined);
    expect(notes.map((n) => n.rule)).toContain("contrast-cut");
    expect(notes.map((n) => n.rule)).not.toContain("forbidden-movement"); // no card, no refusals
  });
});

describe("REQ-STB-043: the revision prompt", () => {
  const notes = reviewPlan(planned([
    { title: "A", durationS: 4, synopsis: "x", shotSize: "WS", angle: "eye", movement: "handheld" },
    { title: "B", durationS: 4, synopsis: "y", shotSize: "WS", angle: "eye", movement: "handheld" },
  ]), card);

  it("carries the notes so the model fixes THESE problems, not imagined ones", () => {
    const p = assembleDirectorPassPrompt({ shots: [], notes, card });
    expect(p).toMatch(/handheld/);
    expect(p).toMatch(/8/);
  });

  it("carries the card's directing block so the revision keeps the style", () => {
    expect(assembleDirectorPassPrompt({ shots: [], notes, card })).toMatch(/DIRECTING \(Cinematic mood film\)/);
  });

  it("never leaks the reference the card was compiled from", () => {
    const compiled: StyleCard = { ...card, provenance: { brief: "shot by Aki Kaurismäki", references: ["Aki Kaurismäki"] } };
    const p = assembleDirectorPassPrompt({ shots: [], notes, card: compiled });
    expect(p.toLowerCase()).not.toContain("kaurism");
  });

  it("demands the same JSON shape back, so the revision is applied like any plan", () => {
    expect(assembleDirectorPassPrompt({ shots: [], notes, card })).toMatch(/"shots"/);
  });
});
