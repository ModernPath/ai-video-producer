// REQ-STB-029 — shot durations follow the active video route (REQ-GEN-023 follow-up).
import { afterEach, describe, expect, it } from "vitest";
import { config, providerLimits, shotDurationPolicy } from "@avd/shared/config";
import { normalizePlannedShots } from "../src/plan-normalize";
import { suggestSyncDurations } from "../src/music-sync";
import { assembleShotPlanPrompt } from "@avd/gen";

const originalRoute = config.gen.videoRoute;
afterEach(() => { config.gen.videoRoute = originalRoute; });

const planShot = (durationS: number) => ({
  title: "S", durationS,
  direction: { synopsis: "s", subject: "x", action: "y" },
  imagePrompt: "img", videoPrompt: "vid",
});

describe("REQ-STB-029: shotDurationPolicy follows the video route", () => {
  it("veo (default): {4,6,8}, cap 8 (INV-STB-001)", () => {
    expect(shotDurationPolicy()).toEqual({ minSeconds: 4, maxSeconds: 8, allowedS: [4, 6, 8] });
  });
  it("omni: every integer second up to the omni clip cap", () => {
    config.gen.videoRoute = "omni";
    expect(shotDurationPolicy()).toEqual({
      minSeconds: 4, maxSeconds: providerLimits.omniVideo.maxClipSeconds,
      allowedS: [4, 5, 6, 7, 8, 9, 10],
    });
  });
});

describe("REQ-STB-029: plan normalization snaps to the route's allowed set", () => {
  it("veo: 5 ties up to 6, 10 clamps to 8 (unchanged behavior)", () => {
    const shots = normalizePlannedShots({ shots: [planShot(5), planShot(10)] });
    expect(shots.map((s) => s.durationS)).toEqual([6, 8]);
  });
  it("omni: 5 and 10 survive as-is; 12 clamps to the cap", () => {
    config.gen.videoRoute = "omni";
    const shots = normalizePlannedShots({ shots: [planShot(5), planShot(10), planShot(12)] });
    expect(shots.map((s) => s.durationS)).toEqual([5, 10, 10]);
  });
});

describe("REQ-STB-029: music-sync suggestions use the route's palette", () => {
  it("omni: a 7s boundary hit becomes suggestible (impossible on veo)", () => {
    const shots = [{ id: "a", title: "A", durationS: 4 }];
    const veo = suggestSyncDurations(shots, [7]);
    expect(veo.suggestions).toHaveLength(0);
    config.gen.videoRoute = "omni";
    const omni = suggestSyncDurations(shots, [7]);
    expect(omni.suggestions).toEqual([{ shotId: "a", title: "A", fromS: 4, toS: 7, boundaryS: 7 }]);
  });
});

describe("REQ-STB-029: shot-plan prompt schema advertises the route's durations", () => {
  const input = { projectTitle: "T", brief: {}, targetDurationSeconds: 20, scriptText: "s" };
  it("veo: durationS 4|6|8", () => {
    expect(assembleShotPlanPrompt(input)).toContain('"durationS":4|6|8');
  });
  it("omni: durationS 4-10 integers", () => {
    config.gen.videoRoute = "omni";
    const p = assembleShotPlanPrompt(input);
    expect(p).toContain('"durationS":4|5|6|7|8|9|10');
  });
});
