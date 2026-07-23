import { describe, expect, it } from "vitest";
import { transcribeAudio } from "@avd/gen";

describe("REQ-GEN-021: dialogue transcription (mock ring)", () => {
  it("mock provider returns timestamped speech for audio input", async () => {
    process.env.MOCK_GEN = "1";
    const out = await transcribeAudio(new Uint8Array([73, 68, 51]), "audio/mpeg");
    expect(out).toMatch(/\[\d{2}:\d{2}\]/);
  });
});
