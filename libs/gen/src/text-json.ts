// REQ-STB-051 — a single structured text call, no generation-ledger row.
//
// Same precedent as `research.ts` and `transcribe.ts`: a critique lens is one cheap text call, and
// a ledger row per lens would bury the shot/frame/take history that the cost meter is for.
import { modelRoutes } from "@avd/shared/config";
import { mockEnabled } from "./service";
import { createGeminiProvider, mockProvider } from "./provider";

export async function textJson<T>(prompt: string, fallback: T): Promise<T> {
  const provider = mockEnabled() ? mockProvider : createGeminiProvider();
  const res = await provider.generateText({ model: modelRoutes.script, prompt, json: true });
  return (res.json as T) ?? fallback;
}
