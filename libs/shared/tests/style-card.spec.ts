import { describe, expect, it } from "vitest";
import {
  styleCardSchema, toDirectingBlock, toGrammarConstraints, toMusicBias, toPlanBias, toPortraitStyle,
  toScenePlateStyle, toVisualStyle, type StyleCard,
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

describe("REQ-STB-042: a card drives planning, music and project defaults", () => {
  it("derives a plan bias from the pacing window and shot-count hint", () => {
    const bias = toPlanBias(kaurismaki);
    expect(bias).toMatch(/6–8/);
    expect(bias).toMatch(/7–9 shots/);
  });

  it("puts the palette in the plan bias so animation shots match the footage (SR-DIR-007)", () => {
    expect(toPlanBias(kaurismaki)).toContain("#c8202a");
    expect(toPlanBias(kaurismaki)).toContain("#4a4a32");
  });

  it("derives a music bias from the card's own sound axis", () => {
    expect(toMusicBias(kaurismaki)).toMatch(/melancholy rock or tango/);
  });

  it("keeps the reference name out of the plan and music biases too", () => {
    for (const block of [toPlanBias(kaurismaki), toMusicBias(kaurismaki)]) {
      expect(block.toLowerCase()).not.toContain("kaurism");
    }
  });

  it("omits a 'None' humour register instead of instructing the music model to be none", () => {
    const bias = toMusicBias(styleCards["cinematic-mood"]!);
    expect(bias).toContain("Sparse ambient instrumental");
    expect(bias).not.toMatch(/Tone: None/);
  });

  it("carries the audio-mode default the archetype recipes used to hold", () => {
    expect(styleCards["brand-pulse"]!.defaults?.audioMode).toBe("music");
    expect(styleCards["product-launch"]!.defaults?.audioMode).toBe("mix");
    expect(styleCards["character-story"]!.defaults?.audioMode).toBe("mix");
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

// REQ-STB-048, from the first real portrait: casting "Colleague" produced a fine likeness with
// "THE WORKER" burned across it in the card's yellow display type, wearing the MAIN character's
// navy work jacket. Both came from reusing the full visual style. A reference portrait is not a
// shot: text baked into it drags into every image conditioned on it, and one character's wardrobe
// is not another's.
describe("REQ-STB-042: a reference portrait uses the world, not the staging", () => {
  const card: StyleCard = {
    ...kaurismaki,
    typography: "Bold centered retro sans-serif lettering in bright yellow.",
    continuity: "The main character wears a faded navy work jacket and carries a steel lunchbox.",
    camera: { ...kaurismaki.camera, notes: "Rigid tripod compositions, classic two-shot rules." },
  };

  it("keeps the film's light and colour, so casting matches the world", () => {
    const p = toPortraitStyle(card);
    expect(p).toContain("Hard practical sources");
    expect(p).toContain("Saturated primary blocks");
  });

  it("drops typography — a reference with lettering burned in poisons every shot it conditions", () => {
    const p = toPortraitStyle(card);
    expect(p).not.toContain(card.typography);          // the card's own type direction
    expect(p).not.toMatch(/bright yellow|sans-serif/i); // and nothing prescribing type
  });

  it("drops the main character's continuity — that wardrobe belongs to someone else", () => {
    expect(toPortraitStyle(card)).not.toMatch(/navy work jacket|lunchbox/i);
  });

  it("drops shot composition — a portrait is not a two-shot", () => {
    expect(toPortraitStyle(card)).not.toMatch(/two-shot|tripod composition/i);
  });

  it("says outright that no text belongs in the frame", () => {
    expect(toPortraitStyle(card)).toMatch(/no text|no lettering|no words/i);
  });
});

// USER 2026-07-27, on a generated take of a CORRIDOR: "I do not understand where these gibberish
// texts in middle of video come from?" — the video showed "The Luting an Dof" in yellow on navy.
//
// `toVisualStyle` fed the card's TYPOGRAPHY axis into every filmed frame and take, so a corridor
// prompt ended with "Minimalist centered mid-century sans-serif title text in bright mustard yellow
// rendered against solid dark navy background cards". The model rendered exactly that, and a video
// model asked for lettering produces pseudo-words. Typography describes GRAPHIC shots — title and
// end cards, rendered locally by Remotion — and has no business in footage.
describe("REQ-STB-042: typography never reaches a filmed prompt", () => {
  const card: StyleCard = {
    ...kaurismaki,
    typography: "Minimalist centered mid-century sans-serif title text in bright mustard yellow on solid dark navy cards.",
  };

  it("keeps the card's type direction out of the visual style", () => {
    const v = toVisualStyle(card);
    expect(v).not.toContain(card.typography);
    expect(v).not.toMatch(/title text|sans-serif|lettering/i);
  });

  it("still carries everything a photograph actually needs", () => {
    const v = toVisualStyle(card);
    expect(v).toContain("Locked off");            // camera
    expect(v).toContain("Hard practical sources"); // light
    expect(v).toContain("Saturated primary blocks"); // palette
    expect(v).toContain("Deadpan");                // performance
  });

  it("keeps typography where it belongs — the plan bias, which drives graphic shots", () => {
    expect(toPlanBias(card)).toContain(card.typography);
  });

  it("still tells the planner about type in the directing block", () => {
    expect(toDirectingBlock(card)).toContain(card.typography);
  });
});

// REQ-STB-053 — a scene plate is not a portrait. The person instructions ("single person, facing
// camera, head and shoulders") would fight an empty room, and a plate with someone standing in it
// would drag that person into every shot conditioned on the space.
describe("REQ-STB-042: a scene plate shows the space, empty", () => {
  const card: StyleCard = { ...kaurismaki, continuity: "Pasi wears a navy jacket and carries a lunchbox." };

  it("keeps the film's light and colour so the space belongs to the film", () => {
    const p = toScenePlateStyle(card);
    expect(p).toContain("Hard practical sources");
    expect(p).toContain("Saturated primary blocks");
  });

  it("drops the main character's continuity — a room wears nothing", () => {
    expect(toScenePlateStyle(card)).not.toMatch(/navy jacket|lunchbox/i);
  });

  it("drops performance direction — nobody is in the plate to perform", () => {
    expect(toScenePlateStyle(card)).not.toMatch(/deadpan|gesture/i);
  });

  it("says the space is empty and carries no text", () => {
    const p = toScenePlateStyle(card);
    expect(p).toMatch(/no people|empty|unoccupied/i);
    expect(p).toMatch(/no text|no lettering/i);
  });
});
