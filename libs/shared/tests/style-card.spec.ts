import { describe, expect, it } from "vitest";
import {
  styleCardSchema, toDirectingBlock, toGrammarConstraints, toVisualStyle,
  type StyleCard,
} from "../src/contracts/style-card";
import { styleCards } from "../src/config/style-cards";

// TASK-DIR-002 / SR-DIR-003 (EPIC-STB-001, USER 2026-07-26 "a 1-minute feature film of ModernPath
// AI directed by Aki Kaurismäki, a bit humoristic"). The six archetypes stop being a hardcoded
// Record of prose and become data with typed craft axes — including the axis nothing could express
// before: what the style REFUSES to do.

const kaurismaki: StyleCard = {
  id: "test-deadpan",
  name: "Deadpan northern comedy",
  provenance: { brief: "1-minute feature film of ModernPath AI directed by Aki Kaurismäki, a bit humoristic", references: ["Aki Kaurismäki"] },
  structure: { arc: "flat affect throughout; the payoff is that nothing escalates", shotCountHint: [7, 9] },
  camera: { allowedMovements: ["static"], preferredSizes: ["MW", "MS"], angles: ["eye"], notes: "Locked off, frontal, symmetrical. Characters centred with headroom." },
  pacing: { durationWindowS: [6, 8] },
  palette: { accent: "#c8202a", background: "#4a4a32", notes: "Saturated primary blocks against drab olive and beige." },
  light: "Hard practical sources, deep shadow, no fill.",
  performance: "Deadpan. Minimal gesture. No smiling, no reaction shots.",
  humour: "Understatement — the joke is the hold, that nothing happens and nobody reacts.",
  sound: "Sparse diegetic room tone; one melancholy rock or tango cue.",
  typography: "Plain, unglamorous, no kinetic flourish.",
  antiNotes: ["no handheld", "no push-ins", "no montage", "no crowd energy", "no upbeat corporate cutting"],
};

describe("REQ-STB-042: Style Card contract", () => {
  it("accepts a fully specified card", () => {
    expect(styleCardSchema.parse(kaurismaki)).toMatchObject({ id: "test-deadpan" });
  });

  it("requires the anti-notes axis to exist — a style is as much what it refuses", () => {
    const { antiNotes: _drop, ...withoutRefusals } = kaurismaki;
    expect(() => styleCardSchema.parse(withoutRefusals)).toThrow();
  });

  it("rejects a palette colour that is not hex — animation props are set from these", () => {
    expect(() => styleCardSchema.parse({ ...kaurismaki, palette: { ...kaurismaki.palette, accent: "red" } })).toThrow();
  });

  it("rejects an inverted duration window", () => {
    expect(() => styleCardSchema.parse({ ...kaurismaki, pacing: { durationWindowS: [8, 6] } })).toThrow();
  });

  it("rejects a card that allows no camera movement at all", () => {
    expect(() => styleCardSchema.parse({ ...kaurismaki, camera: { ...kaurismaki.camera, allowedMovements: [] } })).toThrow();
  });
});

describe("REQ-STB-042: a card drives the grammar grader", () => {
  it("derives the grader's constraints from the card's own axes", () => {
    expect(toGrammarConstraints(kaurismaki)).toEqual({ allowedMovements: ["static"], durationWindowS: [6, 8] });
  });
});

// The epic's governing constraint: a reference name is compiled to primitives at compile time and
// never reaches a prompt afterwards. The planner authors imagePrompt/videoPrompt, so a name leaking
// into the TEXT block would land in visual prompts by the back door — both blocks must be clean.
describe("REQ-STB-042: the reference name never reaches a prompt (SCN-DIR-002)", () => {
  const blocks = () => [toDirectingBlock(kaurismaki), toVisualStyle(kaurismaki)];

  it("keeps the reference name out of both the directing block and the visual style", () => {
    for (const block of blocks()) {
      expect(block.toLowerCase()).not.toContain("kaurismäki");
      expect(block.toLowerCase()).not.toContain("kaurismaki");
    }
  });

  it("keeps the raw brief out too — it carries the name inside it", () => {
    for (const block of blocks()) expect(block).not.toContain(kaurismaki.provenance.brief!);
  });

  it("carries the craft primitives instead, so the style still survives", () => {
    const visual = toVisualStyle(kaurismaki);
    expect(visual).toContain("Locked off");
    expect(visual).toMatch(/Hard practical sources/);
    expect(visual).toMatch(/Saturated primary blocks/);
  });

  it("states the refusals to the planner as explicit avoid-instructions", () => {
    const directing = toDirectingBlock(kaurismaki);
    expect(directing).toMatch(/no handheld/);
    expect(directing).toMatch(/no push-ins/);
  });

  it("carries the humour register, which no archetype could express before", () => {
    expect(toDirectingBlock(kaurismaki)).toMatch(/the joke is the hold/);
  });

  it("forbids the planner from naming any real director or brand in the prompts it writes", () => {
    expect(toDirectingBlock(kaurismaki)).toMatch(/never name .*(director|artist|brand)/i);
  });
});

describe("REQ-STB-042: the six archetypes survive as seed cards", () => {
  it("keeps every existing archetype key so no project loses its selection", () => {
    expect(Object.keys(styleCards).sort()).toEqual(
      ["brand-pulse", "character-story", "cinematic-mood", "hype-countdown", "lyric-video", "product-launch"]
    );
  });

  it("validates every seed card against the contract", () => {
    for (const [key, card] of Object.entries(styleCards)) {
      expect(() => styleCardSchema.parse(card), `seed card ${key} is invalid`).not.toThrow();
    }
  });

  it("gives every seed card refusals — a style with no anti-notes has no point of view", () => {
    for (const [key, card] of Object.entries(styleCards)) {
      expect(card.antiNotes.length, `seed card ${key} has no anti-notes`).toBeGreaterThan(0);
    }
  });

  it("keeps the cinematic-mood card's 8s holds from docs/87", () => {
    expect(styleCards["cinematic-mood"]!.pacing.durationWindowS).toEqual([8, 8]);
  });

  it("keeps hype-countdown on 4s rapid cutting", () => {
    expect(styleCards["hype-countdown"]!.pacing.durationWindowS).toEqual([4, 4]);
  });

  it("carries no reference names — the seeds are original recipes, not compiled from anyone", () => {
    for (const [key, card] of Object.entries(styleCards)) {
      expect(card.provenance.references, `seed card ${key} names a reference`).toEqual([]);
    }
  });
});
