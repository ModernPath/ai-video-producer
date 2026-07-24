import { describe, expect, it } from "vitest";
import { normalizePlannedShots } from "../src/plan-normalize";

// USER BUG 2026-07-23: real-model shot plans come in varied shapes; "Break into shots"
// must normalize them instead of silently producing nothing.
describe("shot plan normalization", () => {
  it("accepts our canonical shape unchanged", () => {
    const shots = normalizePlannedShots({
      shots: [{ title: "A", durationS: 6, direction: { synopsis: "s", subject: "x", action: "a" }, imagePrompt: "ip", videoPrompt: "vp" }],
    });
    expect(shots.length).toBe(1);
    expect(shots[0]!.durationS).toBe(6);
  });

  it("normalizes real-model variants: top-level array, duration/durationSeconds keys, odd durations snapped, missing direction", () => {
    const shots = normalizePlannedShots([
      { title: "One", duration: 5, image_prompt: "city dawn", video_prompt: "slow pan" },
      { name: "Two", durationSeconds: 12, synopsis: "the reveal", imagePrompt: "hero shot" },
      { title: "junk" }, // no usable content -> dropped
    ] as unknown);
    expect(shots.length).toBe(2);
    expect([4, 6, 8]).toContain(shots[0]!.durationS); // 5 -> snapped
    expect(shots[1]!.durationS).toBe(8); // 12 -> clamped to max allowed
    expect(shots[0]!.imagePrompt).toBe("city dawn");
    expect(shots[0]!.direction.synopsis.length).toBeGreaterThan(0);
    expect(shots[1]!.direction.synopsis).toBe("the reveal");
  });

  it("finds shots under alternate keys and returns [] for hopeless input", () => {
    expect(normalizePlannedShots({ plan: [{ title: "X", durationS: 4, imagePrompt: "p" }] }).length).toBe(1);
    expect(normalizePlannedShots({ nothing: true }).length).toBe(0);
    expect(normalizePlannedShots("garbage").length).toBe(0);
  });
});

describe("REQ-STB-024: plan-authored animation shots", () => {
  it("accepts the kinetic template from the plan", () => {
    const out = normalizePlannedShots({ shots: [
      { title: "Interstitial", durationS: 4, direction: { synopsis: "s", subject: "x", action: "y" },
        animation: { template: "kinetic", text: "ONE CITY" } },
    ]});
    expect(out[0]!.animation).toEqual({ template: "kinetic", text: "ONE CITY" });
  });

  it("passes a well-formed animation block through; junk animation dropped", () => {
    const out = normalizePlannedShots({ shots: [
      { title: "Logo out", durationS: 4, direction: { synopsis: "brand end card", subject: "logo", action: "hold" },
        animation: { template: "title", text: "AURORA COFFEE", subtext: "Dawn Ritual" } },
      { title: "Weird", durationS: 4, direction: { synopsis: "x", subject: "y", action: "z" },
        animation: { template: "bogus-template", text: 5 } },
    ]});
    expect(out[0]!.animation).toEqual({ template: "title", text: "AURORA COFFEE", subtext: "Dawn Ritual" });
    expect(out[1]!.animation).toBeUndefined();
  });
});

// REQ-ANM-005 — plan-authored animation palette (Neon Rivers finding: "cyan kinetic" intent
// was dropped and templates rendered default gold).
describe("REQ-ANM-005: planned animation palette", () => {
  const base = { title: "S", durationS: 4, direction: { synopsis: "s", subject: "x", action: "y" }, imagePrompt: "i", videoPrompt: "v" };
  it("valid hex accent/background survive normalization", () => {
    const [s] = normalizePlannedShots({ shots: [{ ...base, animation: { template: "kinetic", text: "NEON", accent: "#00E5FF", background: "#0A0A1A" } }] });
    expect(s!.animation).toEqual({ template: "kinetic", text: "NEON", accent: "#00E5FF", background: "#0A0A1A" });
  });
  it("non-hex colors are dropped, animation kept", () => {
    const [s] = normalizePlannedShots({ shots: [{ ...base, animation: { template: "title", text: "T", accent: "cyan", background: "url(x)" } }] });
    expect(s!.animation).toEqual({ template: "title", text: "T" });
  });
});
