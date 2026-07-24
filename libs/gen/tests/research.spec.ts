// REQ-GEN-024 — web-grounded entity profiles (mock ring; real verification logged 2026-07-24: LastBot).
import { describe, expect, it } from "vitest";
import { assembleResearchPrompt, researchEntityProfile } from "../src/research";

describe("REQ-GEN-024: entity research", () => {
  it("prompt demands factual prose grounded on search + URL, sized for marketing context", () => {
    const p = assembleResearchPrompt({ name: "LastBot", kind: "company", url: "https://lastbot.com" });
    expect(p).toContain("https://lastbot.com");
    expect(p).toMatch(/web search/i);
    expect(p).toMatch(/150-250 word/);
    expect(p).toMatch(/no speculation|rather than inventing/i);
  });
  it("mock mode returns a usable profile without an API key", async () => {
    process.env.MOCK_GEN = "1";
    const out = await researchEntityProfile({ name: "KAIJU", kind: "product" });
    expect(out).toContain("KAIJU");
    delete process.env.MOCK_GEN;
  });
});
