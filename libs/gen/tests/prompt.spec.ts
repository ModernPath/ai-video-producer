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
