import { describe, expect, it } from "vitest";
import { SCRIPT_LENSES, assembleScriptCritiquePrompt, assembleScriptRedraftPrompt } from "../src/critique";
import { mergeCritiques, type Critique } from "../src/critique";
import { styleCards } from "@avd/shared/config";

// USER 2026-07-27, looking at a fresh project with a script and no shots yet: "shouldn't it be run
// for the script?"
//
// Right — and it is the better place. Structure, runtime and who is in the film are decided in the
// SCRIPT; critiquing only the shot plan catches those faults after they have already been broken
// into ten shots. A script critique is a different reading from a shot-plan critique: there are no
// framings or durations to judge yet, only whether the thing being planned is worth planning.
const SCRIPT = `TITLE: MP - Kaurismäki 2
RUN TIME: 60 Seconds
[0:00 - 0:04] TITLE CARD
VISUAL: Solid dark navy screen.
[0:04 - 0:12] PASI AT DESK
Pasi says "The legacy code lacks discipline."`;

describe("REQ-STB-052: the script is critiqued before it becomes shots", () => {
  it("reads the script from more than one seat", () => {
    expect(SCRIPT_LENSES.length).toBeGreaterThanOrEqual(3);
  });

  it("gives each lens a distinct brief", () => {
    const briefs = SCRIPT_LENSES.map((l) => l.brief);
    expect(new Set(briefs).size).toBe(briefs.length);
  });

  it("judges what a SCRIPT decides — runtime, story, cast, voice — not framing or shot length", () => {
    const all = SCRIPT_LENSES.map((l) => `${l.id} ${l.brief}`).join(" ").toLowerCase();
    expect(all).toMatch(/runtime|seconds|time/);
    expect(all).toMatch(/structure|story|arc/);
    expect(all).toMatch(/cast|character/);
    expect(all).not.toMatch(/shotsize|framing repeat/);
  });

  it("puts the script itself in the prompt", () => {
    expect(assembleScriptCritiquePrompt({ lens: SCRIPT_LENSES[0]!, scriptText: SCRIPT, card: undefined, targetDurationS: 60 }))
      .toContain("The legacy code lacks discipline");
  });

  it("tells each lens the runtime the film is supposed to be", () => {
    expect(assembleScriptCritiquePrompt({ lens: SCRIPT_LENSES[0]!, scriptText: SCRIPT, card: undefined, targetDurationS: 60 }))
      .toMatch(/60/);
  });

  it("carries the film's directing block so the critique judges it against its own style", () => {
    const p = assembleScriptCritiquePrompt({ lens: SCRIPT_LENSES[0]!, scriptText: SCRIPT, card: styleCards["cinematic-mood"]!, targetDurationS: 60 });
    expect(p).toMatch(/DIRECTING \(Cinematic mood film\)/);
  });

  // The card's provenance must not reach the prompt. The SCRIPT may legitimately contain the name —
  // it is the user's own text going to a TEXT model, and SCN-DIR-002 governs VISUAL prompts — so
  // this checks the block the card contributes, with a script that does not mention it.
  it("never leaks the reference a card was compiled from", () => {
    const card = { ...styleCards["cinematic-mood"]!, provenance: { brief: "like Aki Kaurismäki", references: ["Aki Kaurismäki"] } };
    const p = assembleScriptCritiquePrompt({ lens: SCRIPT_LENSES[0]!, scriptText: "TITLE: A film\n[0:00] A man sits.", card, targetDurationS: 60 });
    expect(p.toLowerCase()).not.toContain("kaurism");
  });
});

describe("REQ-STB-052: redrafting the script from what the lenses said", () => {
  const issues = mergeCritiques([
    { lens: "runtime", issues: [{ shotTitle: "PASI AT DESK", severity: "error", note: "Eight seconds of screen time for five words" }] },
    { lens: "story", issues: [{ shotTitle: "TITLE CARD", severity: "warning", note: "Opens on a logo, not a situation" }] },
  ] as Critique[]);

  it("carries every issue so the redraft answers all of them", () => {
    const p = assembleScriptRedraftPrompt({ scriptText: SCRIPT, issues, card: undefined, targetDurationS: 60 });
    expect(p).toContain("Eight seconds of screen time for five words");
    expect(p).toContain("Opens on a logo, not a situation");
  });

  it("keeps the original script in the prompt — this is a revision, not a fresh draft", () => {
    expect(assembleScriptRedraftPrompt({ scriptText: SCRIPT, issues, card: undefined, targetDurationS: 60 }))
      .toContain("The legacy code lacks discipline");
  });

  it("asks for a script back, not a JSON contract — script versions are prose", () => {
    const p = assembleScriptRedraftPrompt({ scriptText: SCRIPT, issues, card: undefined, targetDurationS: 60 });
    expect(p).not.toMatch(/"issues"/);          // no structured-output contract
    expect(p).not.toMatch(/Return ONLY JSON/i);
    expect(p).toMatch(/Return the rewritten script/i);
  });

  it("holds the redraft to the runtime it was given", () => {
    expect(assembleScriptRedraftPrompt({ scriptText: SCRIPT, issues, card: undefined, targetDurationS: 60 })).toMatch(/60/);
  });
});
