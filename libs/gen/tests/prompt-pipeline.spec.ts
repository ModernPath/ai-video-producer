import { describe, expect, it } from "vitest";
import { assembleFramePrompt, assembleTakePrompt } from "../src/prompt";

// REQ-GEN-032 (docs/88-architecture-review.md §2) — visual prompt assembly had TWO paths, and the
// planner authors a custom prompt for every shot, so only one of them ever ran in a real film. Rails
// added to the composed branch were dead code in production: four shipped defects trace to it.
//
// These assert the rails a PLANNER-AUTHORED prompt must still carry. Each was genuinely absent.
const base = {
  aspectRatio: "16:9" as const,
  entities: [
    { kind: "person" as const, name: "Pasi", description: "a stoic man in a navy coat" },
    { kind: "product" as const, name: "ModernPath Box", description: "a slate-grey carton" },
  ],
  direction: {
    synopsis: "A corridor at dawn",
    subject: "Pasi",
    action: "walks the length of the corridor",
    camera: "locked off, 35mm",
    mood: "deadpan",
  },
  stylePrompt: "muted teal grade, 35mm grain",
};

describe("REQ-GEN-032: a planner-authored take prompt carries every rail", () => {
  const custom = (over: Record<string, unknown> = {}) =>
    assembleTakePrompt({ ...base, durationSeconds: 6, customPrompt: "A long dark corridor, Pasi walking.", ...over } as never);

  it("uses the author's text verbatim", () => {
    expect(custom()).toContain("A long dark corridor, Pasi walking.");
  });

  it("pins a single continuous shot — a video model will otherwise invent cuts", () => {
    expect(custom()).toMatch(/single continuous shot, no scene cuts/i);
  });

  it("applies the project style kit", () => {
    expect(custom()).toContain("muted teal grade, 35mm grain");
  });

  it("carries sound design when the direction has it", () => {
    expect(custom({ direction: { ...base.direction, audioNotes: "rain hiss, distant bass" } }))
      .toMatch(/Sound design: rain hiss, distant bass/);
  });

  it("states the silent default when there is neither dialogue nor sound design", () => {
    expect(custom()).toMatch(/No dialogue; natural ambient sound only/i);
  });

  it("still carries the spoken line, the no-text rail, brand safety and the format tail", () => {
    const p = custom({ direction: { ...base.direction, dialogue: "We need structure." } });
    expect(p).toContain('Spoken line: "We need structure."');
    expect(p).toMatch(/no on-screen text/i);
    expect(p).toMatch(/never depict real-world third-party brand/i);
    // Unification standardised on the COMPOSED format tail; the custom path had a terser one.
    expect(p).toMatch(/A cinematic 16:9 video clip, 6 seconds, natural motion\./);
  });

  it("does not claim silence when a line is spoken", () => {
    expect(custom({ direction: { ...base.direction, dialogue: "We need structure." } }))
      .not.toMatch(/No dialogue; natural ambient sound only/i);
  });
});

describe("REQ-GEN-032: a planner-authored frame prompt carries every rail", () => {
  const custom = (over: Record<string, unknown> = {}) =>
    assembleFramePrompt({ ...base, customPrompt: "A long dark corridor, Pasi standing.", ...over } as never);

  it("demands appearance preservation when reference images are attached", () => {
    expect(custom({ referenceImageCount: 2 })).toMatch(/features completely unchanged|preserv/i);
  });

  it("keeps printed labels legible or de-emphasised when a product is in the cast", () => {
    expect(custom()).toMatch(/label or printed text/i);
  });

  it("applies the project style kit and the format tail", () => {
    const p = custom();
    expect(p).toContain("muted teal grade, 35mm grain");
    expect(p).toMatch(/A cinematic still image, 16:9, high detail\./);
  });
});

describe("REQ-GEN-032: composed prompts are unchanged by the unification", () => {
  it("still builds from direction when there is no custom text", () => {
    const p = assembleTakePrompt({ ...base, durationSeconds: 6 } as never);
    expect(p).toContain("A corridor at dawn.");
    expect(p).toContain("Pasi — walks the length of the corridor.");
    expect(p).toMatch(/Camera: locked off, 35mm/);
    expect(p).toMatch(/Featuring Pasi/);
  });

  it("is byte-identical for identical inputs", () => {
    const a = assembleTakePrompt({ ...base, durationSeconds: 6 } as never);
    const b = assembleTakePrompt(structuredClone({ ...base, durationSeconds: 6 }) as never);
    expect(a).toBe(b);
  });
});
