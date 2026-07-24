// REQ-GEN-024 (USER 2026-07-24): web-grounded entity profiles — Google Search grounding +
// URL context (ai.google.dev/gemini-api/docs/google-search, /docs/url-context) produce the
// long-form brand/company background that feeds text prompts (REQ-AST-012).
import { modelRoutes } from "@avd/shared/config";
import { mockEnabled } from "./service";
import { ProviderError } from "./provider";

export interface ResearchInput {
  name: string;
  kind: string;
  url?: string | undefined;
}

export function assembleResearchPrompt(i: ResearchInput): string {
  return [
    `Research the ${i.kind} "${i.name}"${i.url ? ` (official site: ${i.url})` : ""} using web search${i.url ? " and the given URL" : ""}.`,
    `Write a factual 150-250 word background profile for use as marketing-video context: what it is, what it does/makes, key products or services, positioning, audience, and brand tone.`,
    `Plain prose only — no markdown, no bullet lists, no speculation beyond what sources support. If sources conflict or are thin, say so briefly rather than inventing.`,
  ].join("\n");
}

/** Direct helper (transcribe.ts pattern): near-free text call, no generation-ledger row. */
export async function researchEntityProfile(input: ResearchInput): Promise<string> {
  if (mockEnabled()) {
    return `${input.name} is a ${input.kind} (mock research profile${input.url ? ` grounded on ${input.url}` : ""}).`;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ProviderError("provider_unavailable", "GEMINI_API_KEY is not set");
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey });
  const res = await client.models.generateContent({
    model: modelRoutes.script,
    contents: assembleResearchPrompt(input),
    config: { tools: [{ googleSearch: {} }, { urlContext: {} }] }, // grounded per the linked docs
  });
  const text = (res.text ?? "").trim();
  if (!text) throw new ProviderError("output_unusable", "empty research response");
  return text;
}
