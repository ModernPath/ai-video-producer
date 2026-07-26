import { describe, expect, it } from "vitest";
import {
  assembleStyleCardPrompt, extractReferences, parseStyleCard, scrubReferences,
} from "../src/style-compiler";
import { toDirectingBlock, toVisualStyle, type StyleCard } from "@avd/shared/contracts";

// TASK-DIR-003 / SR-DIR-004 (EPIC-STB-001, USER 2026-07-26). The compiler turns free-form intent
// into a Style Card using grounded research — the one moment a reference name is legitimately in
// play. Everything downstream must be clean, so the parse step is where the name is stripped.

const BRIEF = "1-minute feature film of ModernPath AI directed by Aki Kaurismäki, a bit humoristic";

const rawCard = (over: Record<string, unknown> = {}) => JSON.stringify({
  name: "Deadpan northern comedy",
  references: ["Aki Kaurismäki"],
  structure: { arc: "flat affect throughout", shotCountHint: [7, 9] },
  camera: { allowedMovements: ["static"], preferredSizes: ["MW", "MS"], angles: ["eye"], notes: "Locked off, frontal, symmetrical." },
  pacing: { durationWindowS: [6, 8] },
  palette: { accent: "#c8202a", background: "#4a4a32", notes: "Saturated primaries against drab olive." },
  light: "Hard practical sources, deep shadow.",
  performance: "Deadpan. No reaction shots.",
  humour: "Understatement — the joke is the hold.",
  sound: "Sparse diegetic; one melancholy tango.",
  typography: "Plain, unglamorous.",
  antiNotes: ["no handheld", "no push-ins"],
  ...over,
});

describe("REQ-GEN-025: the compiler prompt", () => {
  it("carries the user's brief verbatim so intent is not paraphrased away", () => {
    expect(assembleStyleCardPrompt(BRIEF)).toContain(BRIEF);
  });

  it("asks for grounded research on any named reference", () => {
    expect(assembleStyleCardPrompt(BRIEF)).toMatch(/search|research/i);
  });

  it("demands craft primitives, not the name, in the axes themselves", () => {
    const p = assembleStyleCardPrompt(BRIEF);
    expect(p).toMatch(/never (write|name|include).*(name|director)/i);
  });

  it("asks for the refusals — the axis that makes a style a point of view", () => {
    expect(assembleStyleCardPrompt(BRIEF)).toMatch(/antiNotes/);
  });

  it("asks for the humour register explicitly, since a brief may ask for tone", () => {
    expect(assembleStyleCardPrompt(BRIEF)).toMatch(/humour|humor/i);
  });

  // Live compile 2026-07-26 listed "ModernPath AI" among the references. It is the SUBJECT of the
  // film, not a style reference — and scrubbing would then strip the user's own brand out of the
  // craft axes, which BRAND_SAFETY explicitly permits them to name.
  it("tells the model that references are artistic sources only, never the subject or brand", () => {
    expect(assembleStyleCardPrompt(BRIEF)).toMatch(/never .*(the subject|brand|company)/i);
  });

  it("demands the refusals be separate array items, not one joined sentence", () => {
    expect(assembleStyleCardPrompt(BRIEF)).toMatch(/separate|array of short/i);
  });
});

describe("REQ-GEN-025: reference extraction", () => {
  it("takes the references the model reports", () => {
    expect(extractReferences(rawCard())).toEqual(["Aki Kaurismäki"]);
  });

  it("returns none when the brief named nobody", () => {
    expect(extractReferences(rawCard({ references: [] }))).toEqual([]);
  });
});

describe("REQ-GEN-025: parsing a compiled card", () => {
  it("parses a clean response into a valid card", () => {
    const card = parseStyleCard(rawCard(), BRIEF);
    expect(card.name).toBe("Deadpan northern comedy");
    expect(card.pacing.durationWindowS).toEqual([6, 8]);
  });

  it("survives markdown fences, which text models add unbidden", () => {
    expect(parseStyleCard("```json\n" + rawCard() + "\n```", BRIEF).name).toBe("Deadpan northern comedy");
  });

  it("records the brief and references as provenance, set by us and not by the model", () => {
    const card = parseStyleCard(rawCard(), BRIEF);
    expect(card.provenance.brief).toBe(BRIEF);
    expect(card.provenance.references).toEqual(["Aki Kaurismäki"]);
  });

  it("rejects a response that is not a card at all", () => {
    expect(() => parseStyleCard("I'd be happy to help with that!", BRIEF)).toThrow(/could not/i);
  });

  it("rejects a card missing the refusals axis", () => {
    expect(() => parseStyleCard(rawCard({ antiNotes: undefined }), BRIEF)).toThrow();
  });

  // Observed against the live grounded API on the first real compile (2026-07-26): the model
  // returned antiNotes as one semicolon-joined string despite the schema in the prompt.
  it("coerces refusals returned as a single string, which the live model does", () => {
    const card = parseStyleCard(rawCard({ antiNotes: "no handheld; no push-ins; no montage" }), BRIEF);
    expect(card.antiNotes).toEqual(["no handheld", "no push-ins", "no montage"]);
  });

  it("coerces a newline- or pipe-separated refusal string too", () => {
    expect(parseStyleCard(rawCard({ antiNotes: "no zooms\nno crowds" }), BRIEF).antiNotes).toEqual(["no zooms", "no crowds"]);
    expect(parseStyleCard(rawCard({ antiNotes: "no zooms | no crowds" }), BRIEF).antiNotes).toEqual(["no zooms", "no crowds"]);
  });

  // Live compile 2026-07-26 returned all nine refusals as ONE comma-joined sentence.
  it("splits a single long comma-joined refusal into separate refusals", () => {
    const card = parseStyleCard(rawCard({
      antiNotes: "Refuses handheld camera work, quick cuts under four seconds, dynamic whip pans, kinetic tracking shots, emotional acting",
    }), BRIEF);
    expect(card.antiNotes.length).toBeGreaterThan(3);
    expect(card.antiNotes[1]).toBe("quick cuts under four seconds");
  });

  it("does not comma-split a short refusal that legitimately contains one", () => {
    expect(parseStyleCard(rawCard({ antiNotes: "no zooms, ever" }), BRIEF).antiNotes).toEqual(["no zooms, ever"]);
  });

  it("coerces the camera lists the same way, since they fail identically", () => {
    const card = parseStyleCard(rawCard({
      camera: { allowedMovements: "static", preferredSizes: "MW; MS", angles: "eye", notes: "Locked off." },
    }), BRIEF);
    expect(card.camera.allowedMovements).toEqual(["static"]);
    expect(card.camera.preferredSizes).toEqual(["MW", "MS"]);
  });
});

// Defence in depth. The prompt tells the model not to name the reference in the axes; this is what
// happens when it does anyway — which is the realistic case, since "Kaurismäki-like framing" is
// exactly how a language model naturally writes.
describe("REQ-GEN-025: a leaked reference name is scrubbed from the craft axes (SCN-DIR-002)", () => {
  const leaked = () => parseStyleCard(rawCard({
    camera: { allowedMovements: ["static"], preferredSizes: ["MW"], angles: ["eye"], notes: "Kaurismäki-style locked-off framing, frontal and symmetrical." },
    light: "Hard sources in the manner of Aki Kaurismäki.",
    performance: "Deadpan, as Kaurismaki directs his actors.",
  }), BRIEF);

  it("removes the name from every craft axis", () => {
    const card = leaked();
    for (const axis of [card.camera.notes, card.light, card.performance]) {
      expect(axis.toLowerCase()).not.toContain("kaurism");
    }
  });

  it("keeps the surrounding craft description intact", () => {
    const card = leaked();
    expect(card.camera.notes).toMatch(/locked-off framing, frontal and symmetrical/);
    expect(card.light).toMatch(/Hard sources/);
  });

  it("leaves no dangling connectives where the name was removed", () => {
    const card = leaked();
    for (const axis of [card.camera.notes, card.light, card.performance]) {
      expect(axis).not.toMatch(/\s{2,}/);
      expect(axis).not.toMatch(/(in the manner of|as|-style)\s*[.,]/i);
      expect(axis.trim()).toBe(axis);
    }
  });

  it("keeps the name in provenance, where the UI shows what was compiled", () => {
    expect(leaked().provenance.references).toEqual(["Aki Kaurismäki"]);
  });

  it("means neither prompt block can carry the name, end to end", () => {
    const card = leaked();
    for (const block of [toDirectingBlock(card), toVisualStyle(card)]) {
      expect(block.toLowerCase()).not.toContain("kaurism");
    }
  });

  it("scrubs standalone too, for any card from any source", () => {
    const card = { camera: { notes: "Shot like Wes Anderson would." } } as unknown as StyleCard;
    expect(scrubReferences(card, ["Wes Anderson"]).camera.notes).not.toMatch(/Anderson/);
  });
});
