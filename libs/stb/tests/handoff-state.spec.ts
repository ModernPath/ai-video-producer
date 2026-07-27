import { describe, expect, it } from "vitest";
import { handoffState } from "../src/chain";

// USER 2026-07-27: "In my other video, there was already a generated image, so I can't actually go
// to real last frame of previous video."
//
// The panel claimed "starts from its last frame" while showing a frame generated BEFORE the chain
// existed. The automatic handoff is right to refuse clobbering a frame someone chose — but saying
// nothing, and offering no way to refresh it, turns a safe default into a lie on screen.
describe("REQ-STB-058: a sub-clip knows whether its start frame really came from the source", () => {
  it("is 'current' when the frame came from the source's chosen take", () => {
    expect(handoffState({ hasSource: true, sourceTakeGenerationId: "g1", startFrameGenerationId: "g1" })).toBe("current");
  });

  it("is 'stale' when the frame predates the chain — the case the user hit", () => {
    expect(handoffState({ hasSource: true, sourceTakeGenerationId: "g1", startFrameGenerationId: "g-old" })).toBe("stale");
  });

  it("is 'stale' when there is a source take but no frame at all yet", () => {
    expect(handoffState({ hasSource: true, sourceTakeGenerationId: "g1", startFrameGenerationId: null })).toBe("stale");
  });

  it("is 'waiting' while the source has no chosen take to hand anything over", () => {
    expect(handoffState({ hasSource: true, sourceTakeGenerationId: null, startFrameGenerationId: "g-old" })).toBe("waiting");
    expect(handoffState({ hasSource: true, sourceTakeGenerationId: null, startFrameGenerationId: null })).toBe("waiting");
  });

  it("is 'none' for a shot that continues nothing", () => {
    expect(handoffState({ hasSource: false, sourceTakeGenerationId: null, startFrameGenerationId: "g" })).toBe("none");
  });

  it("never claims 'current' without a source take, whatever the frame is", () => {
    expect(handoffState({ hasSource: true, sourceTakeGenerationId: null, startFrameGenerationId: "g1" })).not.toBe("current");
  });
});
