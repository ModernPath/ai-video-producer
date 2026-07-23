import { describe, expect, it } from "vitest";
import { PROMPT_TEMPLATE_VERSION, assembleEditPrompt, assembleFramePrompt, assembleMusicBriefPrompt, assembleTakePrompt } from "../src/prompt";

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
