import { describe, expect, it } from "vitest";
import { config, modelRoutes, priceTable, providerLimits } from "../src/config/index";

describe("shared config invariants", () => {
  it("INV-STB-001: shot duration bounds fit inside the provider clip limit", () => {
    expect(config.shot.minSeconds).toBeGreaterThan(0);
    expect(config.shot.minSeconds).toBeLessThan(config.shot.maxSeconds);
    expect(config.shot.maxSeconds).toBeLessThanOrEqual(providerLimits.video.maxClipSeconds);
  });

  it("INV-AST-004: entity ref cap matches provider consistency guidance", () => {
    expect(config.entity.maxRefs).toBe(providerLimits.image.entityConsistencyRefs);
  });

  it("BR-GEN-001: every generation kind resolves to a model id", () => {
    expect(modelRoutes.take).toMatch(/veo|omni/); // routed to Veo 3.1 until Omni Interactions adapter (OQ-112)
    expect(modelRoutes.frame.draft).toMatch(/image/);
    expect(modelRoutes.script.length).toBeGreaterThan(0);
  });

  it("INV-GEN-003: video pricing is positive so cost recording can never be zeroed silently", () => {
    expect(priceTable.videoPerSecondUsd).toBeGreaterThan(0);
  });
});
