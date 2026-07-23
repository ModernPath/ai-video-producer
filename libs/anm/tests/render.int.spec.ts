import { describe, expect, it } from "vitest";
import { renderAnimation } from "../src/render";

// True Remotion render — slow (webpack bundle + headless chrome). Gated like the real ring.
const enabled = process.env.RUN_RENDER === "1";

describe.skipIf(!enabled)("REQ-ANM-001: Remotion title-card render", () => {
  it("renders an h264 mp4 of the requested duration", async () => {
    const out = await renderAnimation({ template: "title", text: "Hello Remotion", durationS: 4, aspectRatio: "16:9" });
    expect(out.mime).toBe("video/mp4");
    expect(out.bytes.length).toBeGreaterThan(10_000);
    expect(out.durationS).toBe(4);
  }, 300_000);
});

describe.skipIf(!enabled)("REQ-ANM-002: transparent lower-third render", () => {
  it("renders an alpha webm", async () => {
    const out = await renderAnimation({ template: "lower-third", text: "Pasi — Founder", durationS: 4, aspectRatio: "16:9" });
    expect(out.mime).toBe("video/webm");
    expect(out.bytes.length).toBeGreaterThan(5_000);
  }, 300_000);
});

describe.skipIf(!enabled)("REQ-ANM-004: effects compose into TitleCard", () => {
  it("renders with light leaks, grain, and a highlighted word", async () => {
    const out = await renderAnimation({
      template: "title", text: "KAIJU wakes the city", durationS: 4, aspectRatio: "16:9",
      // @ts-expect-error extra props flow through inputProps
      highlightWord: "KAIJU",
    });
    expect(out.mime).toBe("video/mp4");
    expect(out.bytes.length).toBeGreaterThan(10_000);
  }, 300_000);
});

describe.skipIf(!enabled)("REQ-ANM-004: kinetic text template (transforms)", () => {
  it("renders sequential word pops", async () => {
    const out = await renderAnimation({ template: "kinetic", text: "Wake the city with energy", durationS: 4, aspectRatio: "16:9" });
    expect(out.mime).toBe("video/mp4");
    expect(out.bytes.length).toBeGreaterThan(10_000);
  }, 300_000);
});
