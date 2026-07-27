import { describe, expect, it } from "vitest";
import { PROMPT_TEMPLATE_VERSION, assembleEditPrompt, assembleFramePrompt, assembleMusicBriefPrompt, assembleScriptPrompt, assembleShotPlanPrompt, assembleTakePrompt } from "../src/prompt";

const input = {
  aspectRatio: "16:9" as const,
  durationSeconds: 6.5,
  stylePrompt: "neon-noir night city, wet asphalt bounce light",
  entities: [
    { kind: "person" as const, name: "Mika", description: "runner in grey technical jacket" },
    { kind: "product" as const, name: "KAIJU Can", description: "green 330ml energy drink can" },
  ],
  direction: {
    synopsis: "Mika slides under a neon sign, can in hand",
    subject: "Mika",
    action: "low slide toward camera, sparks of rain",
    camera: "low dolly, 24mm, whip-follow",
    mood: "electric night",
    dialogue: undefined,
    audioNotes: "rain hiss, distant bass",
  },
};

describe("REQ-GEN-013: deterministic prompt assembly", () => {
  it("is byte-identical for identical inputs", () => {
    expect(assembleTakePrompt(input)).toBe(assembleTakePrompt(structuredClone(input)));
  });

  it("reads as natural prose with all creative content — no label scaffolding (USER feedback #2)", () => {
    const p = assembleTakePrompt(input);
    expect(p).toContain("Mika slides under a neon sign");
    expect(p).toContain("low dolly");
    expect(p).toContain("Mika");
    expect(p).toContain("runner in grey technical jacket");
    expect(p).toContain("16:9");
    expect(p).toContain("6.5");
    for (const label of ["FORMAT:", "ENTITY:", "SHOT:", "AUDIO:", "STYLE:"]) {
      expect(p).not.toContain(label);
    }
  });

  it("exports a template version for snapshot provenance", () => {
    expect(PROMPT_TEMPLATE_VERSION).toBeGreaterThanOrEqual(1);
  });
});

describe("REQ-GEN-013 v3: model prompt guidelines (USER 2026-07-23 Omni/Nano Banana guide)", () => {
  const base = {
    aspectRatio: "16:9" as const,
    durationSeconds: 6,
    entities: [],
    direction: { synopsis: "A quiet morning", subject: "a barista", action: "pours coffee" },
  };

  it("auto video prompts pin a single continuous shot and default to no dialogue", () => {
    const p = assembleTakePrompt(base);
    expect(p).toMatch(/single continuous shot/i);
    expect(p).toMatch(/no scene cuts/i);
    expect(p).toMatch(/No on-screen text, timestamps/);
    expect(p).toMatch(/no dialogue/i);
  });

  it("dialogue/audio notes replace the no-dialogue default with explicit sound design", () => {
    const p = assembleTakePrompt({
      ...base,
      direction: { ...base.direction, dialogue: "Good morning", audioNotes: "soft cafe ambience" },
    });
    expect(p).not.toMatch(/no dialogue/i);
    expect(p).toMatch(/Sound design: soft cafe ambience/);
  });

  it("frame prompts with reference images demand exact appearance preservation", () => {
    const p = assembleFramePrompt({ ...base, referenceImageCount: 2 });
    expect(p).toMatch(/reference images/i);
    expect(p).toMatch(/completely unchanged|exact appearance/i);
  });

  it("edit prompts are simple and keep everything else the same (inpainting formula)", () => {
    const p = assembleEditPrompt({ instruction: "Make the phone invisible", aspectRatio: "16:9" });
    expect(p).toMatch(/Make the phone invisible/);
    expect(p).toMatch(/Keep everything else in the image exactly the same/);
    expect(p).toMatch(/preserving the original style, lighting, and composition/);
  });

  it("custom user text stays verbatim — guidelines only shape auto prompts", () => {
    const p = assembleTakePrompt({ ...base, customPrompt: "My exact vision" });
    expect(p.startsWith("My exact vision")).toBe(true);
    expect(p).not.toMatch(/single continuous shot/i);
  });
});

describe("music brief prompt is a MUSIC prompt, not a video script (docs/17 Suno round-trip)", () => {
  it("asks for genre/mood/instrumentation and forbids visuals", () => {
    const p = assembleMusicBriefPrompt({
      projectTitle: "Aurora", brief: { idea: "dawn ritual" }, targetDurationSeconds: 30, entities: [],
    });
    expect(p).toMatch(/genre/i);
    expect(p).toMatch(/instrumentation|instruments/i);
    expect(p).toMatch(/mood/i);
    expect(p).toMatch(/paste.*Suno|Suno/i);
    expect(p).toMatch(/no visual|not.*visual|music only|song/i);
  });
});

describe("REQ-STB-023: music brief demands lyrics unless instrumental (Lyria/Suno shared brief)", () => {
  it("asks for full timed lyrics with section tags when not instrumental", () => {
    const p = assembleMusicBriefPrompt({
      projectTitle: "Aurora", brief: { idea: "dawn ritual" }, targetDurationSeconds: 30, entities: [],
    });
    expect(p).toMatch(/lyrics/i);
    expect(p).toMatch(/\[Verse\]|\[Chorus\]/);
    expect(p).toMatch(/unless.*instrumental|instrumental.*no lyrics/i);
  });
});

describe("REQ-STB-026: archetype directing blocks reach the prompts", () => {
  const base = { projectTitle: "T", brief: {}, targetDurationSeconds: 20, entities: [] };
  it("script + plan prompts include the DIRECTING block; plan adds planBias; music adds musicBias", () => {
    const t = { ...base, directing: "DIRECTING (Test): punchy.", planBias: "4s shots only.", musicBias: "Fast drums." };
    expect(assembleScriptPrompt(t)).toContain("DIRECTING (Test): punchy.");
    const plan = assembleShotPlanPrompt({ ...t, scriptText: "s" });
    expect(plan).toContain("DIRECTING (Test): punchy.");
    expect(plan).toContain("4s shots only.");
    expect(assembleMusicBriefPrompt(t)).toContain("Fast drums.");
  });
  it("omitted directing changes nothing", () => {
    expect(assembleScriptPrompt(base)).not.toContain("DIRECTING");
  });
});

describe("REQ-STB-028: transcript reaches the shot-plan prompt for music-led planning", () => {
  it("plan prompt includes the transcript block and alignment instruction", () => {
    const plan = assembleShotPlanPrompt({
      projectTitle: "T", brief: {}, targetDurationSeconds: 20, entities: [], scriptText: "s",
      transcript: "[00:00] [Intro]\n[00:19] [Chorus] hands up",
    });
    expect(plan).toContain("[00:19] [Chorus] hands up");
    expect(plan).toMatch(/align.*sections|sections.*align/i);
    expect(plan).toMatch(/lyric.*animation|animation.*lyric/i);
  });
  it("no transcript, no block", () => {
    const plan = assembleShotPlanPrompt({ projectTitle: "T", brief: {}, targetDurationSeconds: 20, entities: [], scriptText: "s" });
    expect(plan).not.toContain("TRANSCRIPT");
  });
});

describe("label fidelity guidance (evals #2/#5 finding)", () => {
  const base = { aspectRatio: "16:9" as const, direction: { synopsis: "s", subject: "x", action: "y" } };
  it("frame prompts with a product entity warn about printed label text", () => {
    const p = assembleFramePrompt({ ...base, entities: [{ kind: "product", name: "KAIJU Can", description: "green can" }] });
    expect(p).toMatch(/label|printed text/i);
    expect(p).toMatch(/legible|avoid.*close-up/i);
  });
  it("no product, no warning", () => {
    const p = assembleFramePrompt({ ...base, entities: [{ kind: "person", name: "P", description: "d" }] });
    expect(p).not.toMatch(/printed text/i);
  });
});

describe("brand safety guidance (KAIJU Neon Nights production findings 2026-07-24)", () => {
  // Real full-scale run: the PLAN authored "can with a black claw logo" and the frame model drew a
  // Monster Energy mark. Reshoot STILL drew it: the shot's plan-authored script is a customPrompt,
  // which bypassed all guidance, and the entity kind was "character" so the product guard never fired.
  // → brand safety is an UNCONDITIONAL rail on every frame/take prompt, custom prompts included.
  const base = { aspectRatio: "16:9" as const, direction: { synopsis: "s", subject: "x", action: "y" } };
  it("frame prompts always forbid third-party brand marks (any entity kind, or none)", () => {
    for (const entities of [[], [{ kind: "character" as const, name: "KAIJU Can", description: "green can" }]]) {
      const p = assembleFramePrompt({ ...base, entities });
      expect(p).toMatch(/never.*(real-world|third-party).*(brand|logo)/i);
    }
  });
  it("take prompts always forbid third-party brand marks", () => {
    const p = assembleTakePrompt({ ...base, durationSeconds: 4, entities: [] });
    expect(p).toMatch(/never.*(real-world|third-party).*(brand|logo)/i);
  });
  it("CUSTOM frame/take prompts keep the verbatim body but gain the safety rail", () => {
    const f = assembleFramePrompt({ ...base, entities: [], customPrompt: "my exact vision" });
    expect(f).toContain("my exact vision");
    expect(f).toMatch(/never.*(real-world|third-party).*(brand|logo)/i);
    const t = assembleTakePrompt({ ...base, durationSeconds: 4, entities: [], customPrompt: "my exact vision" });
    expect(t).toContain("my exact vision");
    expect(t).toMatch(/never.*(real-world|third-party).*(brand|logo)/i);
  });
  it("shot-plan prompt always carries the brand-invention rule (drift starts at planning)", () => {
    const p = assembleShotPlanPrompt({ projectTitle: "T", brief: {}, targetDurationSeconds: 20, scriptText: "s" });
    expect(p).toMatch(/invent.*original.*(brand|mark|logo)/i);
    expect(p).toMatch(/never.*(real-world|third-party|existing).*(brand|logo)/i);
  });
});

describe("entity prose dedup", () => {
  it("skips the description when it merely repeats the name", () => {
    const p = assembleFramePrompt({
      aspectRatio: "16:9", direction: { synopsis: "s", subject: "x", action: "y" },
      entities: [{ kind: "person", name: "Pasi", description: "Pasi" }],
    });
    expect(p).toContain("Featuring Pasi.");
    expect(p).not.toContain("Pasi, Pasi");
  });
});

describe("REQ-AST-012: entity profile feeds TEXT prompts only (USER 2026-07-24: marketing context)", () => {
  const co = { kind: "company" as const, name: "LastBot", description: "AI consultancy", profile: "LastBot Oy builds AI-native customer experiences for enterprises across the Nordics; founded 2023; known for pragmatic LLM deployments." };
  it("script + plan prompts carry the profile as background", () => {
    const base = { projectTitle: "T", brief: {}, targetDurationSeconds: 20, entities: [co] };
    expect(assembleScriptPrompt(base)).toContain("LastBot Oy builds AI-native");
    expect(assembleShotPlanPrompt({ ...base, scriptText: "s" })).toContain("LastBot Oy builds AI-native");
  });
  it("frame/take prompts use only the short description (profiles would pollute visual prompts)", () => {
    const visual = { aspectRatio: "16:9" as const, direction: { synopsis: "s", subject: "x", action: "y" }, entities: [co] };
    expect(assembleFramePrompt(visual)).not.toContain("LastBot Oy builds");
    expect(assembleTakePrompt({ ...visual, durationSeconds: 4 })).not.toContain("LastBot Oy builds");
    expect(assembleFramePrompt(visual)).toContain("AI consultancy");
  });
  it("profile is truncated to the configured cap in text prompts", () => {
    const long = { ...co, profile: "x".repeat(5000) };
    const p = assembleScriptPrompt({ projectTitle: "T", brief: {}, targetDurationSeconds: 20, entities: [long] });
    expect(p.length).toBeLessThan(4000);
  });
});

// REQ-STB-036 (USER 2026-07-24: "always repeating one… possibility to choose") — the planner
// must know every template and be told to VARY them across animation shots.
describe("REQ-STB-036: plan prompt offers the full template set with variability guidance", () => {
  it("schema line lists all five full-frame templates and guidance says to vary", () => {
    const p = assembleShotPlanPrompt({ projectTitle: "T", brief: {}, targetDurationSeconds: 20, entities: [], scriptText: "s" });
    for (const t of ["title", "kinetic", "stat", "quote", "checklist"]) {
      expect(p).toContain(`"${t}"`);
    }
    expect(p.toLowerCase()).toContain("vary");
  });
});

// SR-DIR-005 (EPIC-STB-001, TASK-DIR-004): visual prompts are built from the card's craft
// primitives, and the reference the card was compiled from must never reach an image or video
// model — the governing constraint of the epic (SCN-DIR-002).
describe("REQ-GEN-026: card-driven visual prompts exclude the reference name", () => {
  const card = {
    id: "c", name: "Deadpan northern comedy",
    provenance: { brief: "a film directed by Aki Kaurismäki", references: ["Aki Kaurismäki"] },
    structure: { arc: "flat affect" },
    camera: { allowedMovements: ["static"] as const, preferredSizes: ["MW"] as const, angles: ["eye"] as const, notes: "Locked off, frontal." },
    pacing: { durationWindowS: [6, 8] as [number, number] },
    palette: { accent: "#c8202a", background: "#4a4a32", notes: "Saturated primaries against drab olive." },
    light: "Hard practical sources.", performance: "Deadpan.", humour: "Understatement.",
    sound: "Sparse.", typography: "Plain.", antiNotes: ["no handheld"],
  };

  it("folds the card's craft primitives into the frame prompt", () => {
    const p = assembleFramePrompt({ ...input, card } as never);
    expect(p).toContain("Locked off, frontal.");
    expect(p).toContain("Saturated primaries against drab olive.");
  });

  it("folds them into the take prompt too", () => {
    const p = assembleTakePrompt({ ...input, durationSeconds: 6, card } as never);
    expect(p).toContain("Hard practical sources.");
  });

  it("never lets the reference name or the raw brief into either visual prompt", () => {
    for (const p of [assembleFramePrompt({ ...input, card } as never), assembleTakePrompt({ ...input, durationSeconds: 6, card } as never)]) {
      expect(p.toLowerCase()).not.toContain("kaurism");
      expect(p).not.toContain(card.provenance.brief);
    }
  });

  it("keeps a user's own custom prompt verbatim but still adds the card look", () => {
    const p = assembleTakePrompt({ ...input, durationSeconds: 6, card, customPrompt: "A red kettle boils." } as never);
    expect(p).toContain("A red kettle boils.");
    expect(p).toContain("Locked off, frontal.");
    expect(p.toLowerCase()).not.toContain("kaurism");
  });

  it("still works with no card at all", () => {
    expect(assembleFramePrompt(input)).toBeTruthy();
  });

  // USER 2026-07-26, reading a real shot's IMAGE SCRIPT: "Cinematic 35mm film frame, Aki
  // Kaurismäki visual style." The PLANNER wrote the reference into the shot's own prompt despite
  // being told not to, and a custom prompt goes to the image model verbatim — so the name reached
  // the picture by a path none of the earlier guards covered.
  it("strips the reference from a plan-authored custom prompt", () => {
    const p = assembleFramePrompt({
      ...input, card,
      customPrompt: "Cinematic 35mm film frame, Aki Kaurismäki visual style. Symmetrical bus shelter.",
    } as never);
    expect(p.toLowerCase()).not.toContain("kaurism");
    expect(p).toContain("Cinematic 35mm film frame");
    expect(p).toContain("Symmetrical bus shelter.");
  });

  it("strips it from a custom VIDEO prompt too", () => {
    const p = assembleTakePrompt({
      ...input, durationSeconds: 6, card,
      customPrompt: "Static wide, in the style of Aki Kaurismäki, a man waits.",
    } as never);
    expect(p.toLowerCase()).not.toContain("kaurism");
    expect(p).toContain("a man waits.");
  });

  it("strips it from the direction the planner wrote, not just the custom prompt", () => {
    const p = assembleFramePrompt({
      ...input, card,
      direction: { ...input.direction, mood: "melancholy, very Kaurismäki" },
    } as never);
    expect(p.toLowerCase()).not.toContain("kaurism");
  });

  it("leaves prompts alone when the card names no reference", () => {
    const plain = { ...card, provenance: { references: [] } };
    const text = "A red kettle boils.";
    expect(assembleFramePrompt({ ...input, card: plain, customPrompt: text } as never)).toContain(text);
  });
});

// USER 2026-07-27: "video script still has no details in it, at original video I see Pasi is
// talking something ('follow the modern path'), but in video prompt all of that is missing."
//
// Two faults. (a) The shot-plan schema never asked for `dialogue`, so the planner dropped every
// spoken line the script had written — all 11 shots came back with it empty. (b) Even when a shot
// HAS dialogue, `assembleTakePrompt` short-circuits on a custom prompt and returns before the
// `Spoken line:` clause is ever added — and the planner always writes a custom videoPrompt, so the
// line could never reach the video model by any path.
describe("REQ-GEN-028: spoken lines survive from script to video model", () => {
  it("asks the planner for each shot's dialogue, verbatim from the script", () => {
    const p = assembleShotPlanPrompt({ projectTitle: "T", brief: {}, targetDurationSeconds: 30, scriptText: "s" });
    expect(p).toMatch(/"dialogue"/);
    expect(p).toMatch(/verbatim|exact/i);
  });

  it("adds the spoken line to a custom video prompt, which is the only kind the planner writes", () => {
    const out = assembleTakePrompt({
      ...input, durationSeconds: 6,
      customPrompt: "Static medium close-up on Pasi, flat solemn expression.",
      direction: { ...input.direction, dialogue: "The legacy code lacks discipline." },
    });
    expect(out).toContain("Static medium close-up on Pasi");
    expect(out).toContain('Spoken line: "The legacy code lacks discipline."');
  });

  it("does not repeat the line when the prompt already quotes it", () => {
    const line = "We need structure.";
    const out = assembleTakePrompt({
      ...input, durationSeconds: 6,
      customPrompt: `Pasi says "${line}" to camera.`,
      direction: { ...input.direction, dialogue: line },
    });
    expect(out.match(/We need structure/g)).toHaveLength(1);
  });

  it("does not double-punctuate a line that already ends in a full stop", () => {
    for (const out of [
      assembleTakePrompt({ ...input, durationSeconds: 6, customPrompt: "A close-up.", direction: { ...input.direction, dialogue: "We need structure." } }),
      assembleTakePrompt({ ...input, durationSeconds: 6, direction: { ...input.direction, dialogue: "We need structure." } }),
    ]) {
      expect(out).toContain('Spoken line: "We need structure."');
      expect(out).not.toMatch(/"\.\s*\./);
    }
  });

  it("still ends the clause when the line has no punctuation of its own", () => {
    const out = assembleTakePrompt({ ...input, durationSeconds: 6, direction: { ...input.direction, dialogue: "Follow the modern path" } });
    expect(out).toContain('Spoken line: "Follow the modern path".');
  });

  it("leaves a silent shot silent", () => {
    const out = assembleTakePrompt({
      ...input, durationSeconds: 6, customPrompt: "An empty tram interior.",
      direction: { ...input.direction, dialogue: undefined },
    });
    expect(out).not.toMatch(/Spoken line/);
  });

  it("still carries dialogue on the non-custom path", () => {
    const out = assembleTakePrompt({
      ...input, durationSeconds: 6,
      direction: { ...input.direction, dialogue: "ModernPath. Production ready." },
    });
    expect(out).toContain('Spoken line: "ModernPath. Production ready."');
  });
});

// REQ-STB-048 (USER 2026-07-27): the planner must cast the film, not just describe it.
describe("REQ-GEN-030: the shot plan names the cast the film needs", () => {
  const plan = () => assembleShotPlanPrompt({
    projectTitle: "T", brief: {}, targetDurationSeconds: 60, scriptText: "Pasi and a colleague drink coffee.",
  });

  it("asks for a cast list alongside the shots", () => {
    expect(plan()).toMatch(/"cast"\s*:/);
  });

  it("asks for a concrete, repeatable appearance — the seed for a reference portrait", () => {
    expect(plan()).toMatch(/appearance/i);
    expect(plan()).toMatch(/repeat|consistent|same/i);
  });

  it("demands EVERY recurring body on screen, not just the named lead", () => {
    expect(plan()).toMatch(/every (character|person)|unnamed|background|extra/i);
  });

  it("offers only the kinds the entity model has", () => {
    const p = plan();
    for (const k of ["company", "product", "person", "character"]) expect(p).toContain(`"${k}"`);
  });

  it("tells the planner to reference cast by the names it just assigned", () => {
    expect(plan()).toMatch(/by name/i);
  });
});
