// REQ-GEN-010 — GenProvider port. Implementations: mock (fixtures), gemini (real), test stubs.
import { config, providerLimits } from "@avd/shared/config";
import { fixtureMp4, fixtureMusicBrief, fixtureScript, fixtureShotPlan, fixtureSvg } from "./fixtures";

export type ProviderErrorCode = "content_policy" | "provider_unavailable" | "invalid_reference" | "output_unusable";

export class ProviderError extends Error {
  constructor(public code: ProviderErrorCode, message: string) {
    super(message);
  }
}

export interface TextRequest {
  model: string;
  prompt: string;
  json?: boolean;
  meta?: Record<string, unknown>; // snapshot input (mock uses it; real providers ignore)
}
export interface ImageRequest {
  model: string;
  prompt: string;
  aspectRatio: "16:9" | "9:16";
  seed?: string;
  label?: string;
  refImages?: { bytes: Uint8Array; mime: string }[]; // entity/style refs (BR-GEN-003)
}
export interface VideoRequest {
  model: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: "16:9" | "9:16";
  startFrame?: { bytes: Uint8Array; mime: string };
}

export interface GenProvider {
  readonly name: string;
  /** false → cost recorded as 0 (mock); true → price table applies (INV-GEN-003). */
  readonly billsCost: boolean;
  generateText(r: TextRequest): Promise<{ text?: string; json?: unknown }>;
  generateImage(r: ImageRequest): Promise<{ bytes: Uint8Array; mime: string }>;
  generateVideo(r: VideoRequest): Promise<{ bytes: Uint8Array; mime: string; durationS: number }>;
}

export const mockProvider: GenProvider = {
  name: "mock",
  billsCost: false,
  async generateText(r) {
    const meta = (r.meta ?? {}) as { projectTitle?: string; brief?: Record<string, unknown>; targetDurationSeconds?: number };
    const ti = {
      projectTitle: meta.projectTitle ?? "Untitled",
      brief: meta.brief ?? {},
      targetDurationSeconds: meta.targetDurationSeconds ?? config.project.defaultTargetDurationSeconds,
    };
    if (r.json) {
      const ents = ((r.meta as { entities?: { name: string }[] } | undefined)?.entities ?? []) as { name: string }[];
      return { json: { shots: fixtureShotPlan({ ...ti, minS: config.shot.minSeconds, maxS: config.shot.maxSeconds, entities: ents }) } };
    }
    if ((r.meta as { kind?: string } | undefined)?.kind === "music_brief") return { text: fixtureMusicBrief(ti) };
    return { text: fixtureScript(ti) };
  },
  async generateImage(r) {
    return { bytes: fixtureSvg(r.seed ?? r.prompt, r.label ?? "mock", r.aspectRatio), mime: "image/svg+xml" };
  },
  async generateVideo(r) {
    return { bytes: fixtureMp4(), mime: "video/mp4", durationS: r.durationSeconds };
  },
};

/**
 * Real Gemini adapter (text + image). The Omni video call is the OQ-101/102 paid spike:
 * async delivery/polling per https://ai.google.dev/gemini-api/docs/omni — until then it
 * fails cleanly as provider_unavailable so nothing pretends to be a real take.
 */
export function createGeminiProvider(): GenProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ProviderError("provider_unavailable", "GEMINI_API_KEY is not set");

  return {
    name: "gemini",
    billsCost: true,
    async generateText(r) {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey });
      try {
        const res = await client.models.generateContent({
          model: r.model,
          contents: r.prompt,
          ...(r.json ? { config: { responseMimeType: "application/json" } } : {}),
        });
        const text = res.text ?? "";
        if (!text) throw new ProviderError("output_unusable", "empty text response");
        if (!r.json) return { text };
        // real models sometimes wrap JSON in fences or prose — extract the JSON body
        const cleaned = text.replace(/```(?:json)?/g, "").trim();
        const start = Math.min(...["{", "["].map((c) => (cleaned.indexOf(c) + 1 || Infinity)) ) - 1;
        const jsonText = start >= 0 && Number.isFinite(start) ? cleaned.slice(start) : cleaned;
        try {
          return { json: JSON.parse(jsonText) };
        } catch {
          throw new ProviderError("output_unusable", `model returned non-JSON structured output: ${text.slice(0, 200)}`);
        }
      } catch (err) {
        throw mapGeminiError(err);
      }
    },
    async generateImage(r) {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey });
      try {
        const res = await client.models.generateContent({
          model: r.model,
          contents: r.refImages?.length
            ? [
                { text: r.prompt },
                ...r.refImages.map((img) => ({ inlineData: { data: Buffer.from(img.bytes).toString("base64"), mimeType: img.mime } })),
              ]
            : r.prompt,
          config: { imageConfig: { aspectRatio: r.aspectRatio } },
        });
        const part = res.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data);
        if (!part?.inlineData?.data) throw new ProviderError("output_unusable", "no image in response");
        return {
          bytes: Uint8Array.from(Buffer.from(part.inlineData.data, "base64")),
          mime: part.inlineData.mimeType ?? "image/png",
        };
      } catch (err) {
        throw mapGeminiError(err);
      }
    },
    async generateVideo(r) {
      // OQ-101/102/104 resolved 2026-07-23: SDK GenerateVideosConfig supports durationSeconds,
      // resolution, lastFrame + referenceImages, generateAudio. Long-running op + polling.
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey });
      try {
        let op = await client.models.generateVideos({
          model: r.model,
          prompt: r.prompt,
          ...(r.startFrame
            ? { image: { imageBytes: Buffer.from(r.startFrame.bytes).toString("base64"), mimeType: r.startFrame.mime } }
            : {}),
          config: {
            aspectRatio: r.aspectRatio,
            // Veo 3.1 accepts only {4,6,8}s (spike 2026-07-23: 5 rejected, 4 accepted) — snap up on ties.
            durationSeconds: [...providerLimits.video.allowedDurationsS].reduce((best, d) =>
              Math.abs(d - r.durationSeconds) < Math.abs(best - r.durationSeconds) || (Math.abs(d - r.durationSeconds) === Math.abs(best - r.durationSeconds) && d > best) ? d : best),
            numberOfVideos: 1,
            // NB: generateAudio is Vertex-only (spike 2026-07-23) — Gemini API rejects it;
            // Omni outputs native audio by default (docs/00 §3).
          },
        });
        const deadline = Date.now() + 5 * 60_000;
        while (!op.done) {
          if (Date.now() > deadline) throw new ProviderError("provider_unavailable", "video operation timed out (5m)");
          await new Promise((res) => setTimeout(res, 5000));
          op = await client.operations.getVideosOperation({ operation: op });
        }
        const vid = op.response?.generatedVideos?.[0]?.video;
        if (!vid) {
          throw new ProviderError("output_unusable", `no video in response: ${JSON.stringify(op.error ?? {}).slice(0, 300)}`);
        }
        let bytes: Uint8Array;
        if (vid.videoBytes) {
          bytes = Uint8Array.from(Buffer.from(vid.videoBytes, "base64"));
        } else if (vid.uri) {
          const res = await fetch(vid.uri, { headers: { "x-goog-api-key": apiKey } });
          if (!res.ok) throw new ProviderError("output_unusable", `video download failed: ${res.status}`);
          bytes = new Uint8Array(await res.arrayBuffer());
        } else {
          throw new ProviderError("output_unusable", "video has neither bytes nor uri");
        }
        const snapped = [...providerLimits.video.allowedDurationsS].reduce((best, d) =>
          Math.abs(d - r.durationSeconds) < Math.abs(best - r.durationSeconds) || (Math.abs(d - r.durationSeconds) === Math.abs(best - r.durationSeconds) && d > best) ? d : best);
        return { bytes, mime: vid.mimeType ?? "video/mp4", durationS: snapped };
      } catch (err) {
        throw mapGeminiError(err);
      }
    },
  };
}

function mapGeminiError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  const msg = String((err as Error)?.message ?? err);
  if (/safety|blocked|prohibited|policy/i.test(msg)) return new ProviderError("content_policy", msg); // INV-GEN-006
  if (/api key|permission|quota|429|5\d\d/i.test(msg)) return new ProviderError("provider_unavailable", msg);
  return new ProviderError("provider_unavailable", msg);
}

export function defaultProvider(): GenProvider {
  return process.env.MOCK_GEN === "1" ? mockProvider : createGeminiProvider();
}
