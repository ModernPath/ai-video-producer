// REQ-GEN-021: transcribe raw audio bytes (dialogue captions). Provider-routed like everything else.
import { modelRoutes } from "@avd/shared/config";
import { mockEnabled } from "./service";
import { createGeminiProvider, mockProvider } from "./provider";

const DIALOGUE_INSTRUCTION =
  "Transcribe all spoken dialogue in this audio precisely. Output one line per utterance formatted as [MM:SS] text — timestamp from the start. If multiple speakers, prefix the speaker. Ignore music and sound effects. If there is no speech at all, output exactly: NO_SPEECH";

export async function transcribeAudio(bytes: Uint8Array, mime: string): Promise<string | null> {
  const provider = mockEnabled() ? mockProvider : createGeminiProvider();
  const res = await provider.generateText({
    model: modelRoutes.transcript,
    prompt: DIALOGUE_INSTRUCTION,
    audio: { bytes, mime },
  });
  const text = res.text?.trim() ?? "";
  return !text || text === "NO_SPEECH" ? null : text;
}
