import { describe, expect, it } from "vitest";
import { PROMPT_TEMPLATE_VERSION, assembleTakePrompt } from "../src/prompt";

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

  it("contains format, style, entity, shot, audio blocks in documented order (docs/14 §5)", () => {
    const p = assembleTakePrompt(input);
    const order = ["FORMAT:", "STYLE:", "ENTITY:", "SHOT:", "AUDIO:"].map((m) => p.indexOf(m));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(p).toContain("16:9");
    expect(p).toContain("6.5");
    expect(p).toContain("Mika");
  });

  it("exports a template version for snapshot provenance", () => {
    expect(PROMPT_TEMPLATE_VERSION).toBeGreaterThanOrEqual(1);
  });
});
