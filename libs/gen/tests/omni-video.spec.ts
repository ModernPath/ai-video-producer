// REQ-GEN-023 — Omni video take route (OQ-112 resolution 2026-07-24).
import { afterEach, describe, expect, it } from "vitest";
import { config, omniVideoModel, modelRoutes, priceTable } from "@avd/shared/config";
import { resolveModel } from "../src/routing";
import { buildOmniVideoRequest } from "../src/provider";
import { computeCostUsd } from "../src/cost";

const originalRoute = config.gen.videoRoute;
afterEach(() => { config.gen.videoRoute = originalRoute; });

describe("REQ-GEN-023: route selection (config, not literals)", () => {
  it("takes route to Veo by default", () => {
    expect(resolveModel("take")).toBe(modelRoutes.take);
  });
  it("videoRoute=omni routes take + retake to the Interactions model", () => {
    config.gen.videoRoute = "omni";
    expect(resolveModel("take")).toBe(omniVideoModel);
    expect(resolveModel("retake")).toBe(omniVideoModel);
    expect(resolveModel("frame")).toBe(modelRoutes.frame.standard); // untouched
  });
});

describe("REQ-GEN-023: Interactions request builder (tags bind by image position)", () => {
  const px = { bytes: new Uint8Array([1]), mime: "image/jpeg" };
  it("start frame is image 1 tagged <FIRST_FRAME>; entity refs are <IMAGE_REF_2..>", () => {
    const req = buildOmniVideoRequest({
      model: omniVideoModel, prompt: "The can drops.", durationSeconds: 5, aspectRatio: "16:9",
      startFrame: px, refImages: [px, px],
    });
    const blocks = req.input as Array<{ type: string; text?: string }>;
    expect(blocks.map((b) => b.type)).toEqual(["image", "image", "image", "text"]);
    const text = blocks[3]!.text!;
    expect(text).toContain("<FIRST_FRAME>");
    expect(text).toContain("<IMAGE_REF_2>");
    expect(text).toContain("<IMAGE_REF_3>");
    expect(text).toContain("The can drops.");
    expect(text).toContain("Duration: 5 seconds"); // free-form — no {4,6,8} snap
    expect(req.response_format).toEqual({ type: "video" });
  });
  it("no images -> plain text input, still duration-pinned", () => {
    const req = buildOmniVideoRequest({ model: omniVideoModel, prompt: "A boat drifts.", durationSeconds: 10, aspectRatio: "16:9" });
    expect(typeof req.input).toBe("string");
    expect(req.input).toContain("Duration: 10 seconds");
  });
  it("refs without a start frame are <IMAGE_REF_1..>", () => {
    const req = buildOmniVideoRequest({ model: omniVideoModel, prompt: "p", durationSeconds: 4, aspectRatio: "16:9", refImages: [px] });
    const blocks = req.input as Array<{ type: string; text?: string }>;
    expect(blocks.map((b) => b.type)).toEqual(["image", "text"]);
    expect(blocks[1]!.text).toContain("<IMAGE_REF_1>");
    expect(blocks[1]!.text).not.toContain("<FIRST_FRAME>");
  });
});

describe("REQ-GEN-023: omni cost derives from video tokens (INV-GEN-003)", () => {
  it("6s omni take = 6 x tokensPerSecond x usdPerMTokens", () => {
    const expected = (6 * priceTable.omniVideoTokensPerSecond * priceTable.omniVideoUsdPerMTokens) / 1_000_000;
    expect(computeCostUsd("take", { durationSeconds: 6, model: omniVideoModel })).toBeCloseTo(expected, 6);
    expect(expected).toBeCloseTo(0.6082, 4); // sanity vs spike math
  });
  it("veo takes keep the per-second rate", () => {
    expect(computeCostUsd("take", { durationSeconds: 6, model: modelRoutes.take })).toBeCloseTo(0.6, 6);
    expect(computeCostUsd("take", { durationSeconds: 6 })).toBeCloseTo(0.6, 6); // model omitted = legacy path
  });
});
