// REQ-GEN-010 — GenProvider port. Implementations: mock (fixtures), gemini (real), test stubs.
import { config, omniVideoModel, providerLimits } from "@avd/shared/config";
import { fixtureMp4, fixtureMusicBrief, fixtureScript, fixtureShotPlan, fixtureSvg } from "./fixtures";

export type ProviderErrorCode = "content_policy" | "provider_unavailable" | "invalid_reference" | "output_unusable";

export class ProviderError extends Error {
  constructor(public code: ProviderErrorCode, message: string) {
    super(message);
  }
}

export interface TextRequest {
  audio?: { bytes: Uint8Array; mime: string } | undefined; // REQ-GEN-020
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
  /** REQ-GEN-023: entity refs — used by the omni route as <IMAGE_REF_N> subject conditioning. */
  refImages?: { bytes: Uint8Array; mime: string }[];
}

/**
 * REQ-GEN-023 — pure request builder for the Omni Interactions video call (unit-tested).
 * Tags live in the prompt TEXT and bind to image blocks by 1-based position (spike 2026-07-24):
 * start frame first as <FIRST_FRAME>, entity refs after as <IMAGE_REF_N>. Duration is prompt-
 * driven and free-form ("Duration: 10 seconds." honored — no {4,6,8} snap on this route).
 */
export function buildOmniVideoRequest(r: VideoRequest): { model: string; input: string | unknown[]; response_format: { type: "video" } } {
  const images = [...(r.startFrame ? [r.startFrame] : []), ...(r.refImages ?? [])];
  const parts: string[] = [];
  if (r.startFrame) parts.push(`<FIRST_FRAME> is the exact first frame of this video.`);
  if (r.refImages?.length) {
    const offset = r.startFrame ? 2 : 1;
    const tags = r.refImages.map((_, i) => `<IMAGE_REF_${offset + i}>`).join(", ");
    parts.push(`Preserve the exact appearance and design of the subjects shown in ${tags}.`);
  }
  parts.push(r.prompt);
  parts.push(`Duration: ${r.durationSeconds} seconds. ${r.aspectRatio} video.`);
  const text = parts.join(" ");
  if (!images.length) return { model: r.model, input: text, response_format: { type: "video" } };
  return {
    model: r.model,
    input: [
      ...images.map((img) => ({ type: "image", data: Buffer.from(img.bytes).toString("base64"), mime_type: img.mime })),
      { type: "text", text },
    ],
    response_format: { type: "video" },
  };
}

export interface GenProvider {
  readonly name: string;
  /** false → cost recorded as 0 (mock); true → price table applies (INV-GEN-003). */
  readonly billsCost: boolean;
  generateText(r: TextRequest): Promise<{ text?: string; json?: unknown }>;
  generateImage(r: ImageRequest): Promise<{ bytes: Uint8Array; mime: string }>;
  generateVideo(r: VideoRequest): Promise<{ bytes: Uint8Array; mime: string; durationS: number }>;
  generateMusic(r: { model: string; prompt: string }): Promise<{ bytes: Uint8Array; mime: string }>;
}

export const mockProvider: GenProvider = {
  name: "mock",
  billsCost: false,
  async generateText(r) {
    if (r.audio) {
      return { text: "[00:00] (intro) instrumental\n[00:05] [Verse] mock line one\n[00:12] [Chorus] mock chorus line" };
    }
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
  async generateMusic() {
    // tiny valid MP3 header + silence — enough for storage/attach flows
    const silent = Buffer.from("SUQzAwAAAAAAF1RJVDIAAAANAAAAbW9jayB0cmFjawD/+1DEAAAAAAAAAAAAAAAAAAAAAABJbmZvAAAADwAAAAIAAAGgAJycnJycnJycnJycnJycnJycnJycnJycnJzJycnJycnJycnJycnJycnJycnJycnJycnJz/", "base64");
    return { bytes: new Uint8Array(silent), mime: "audio/mpeg" };
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
          contents: r.audio
            ? [{ role: "user", parts: [
                { inlineData: { data: Buffer.from(r.audio.bytes).toString("base64"), mimeType: r.audio.mime } },
                { text: r.prompt },
              ] }]
            : r.prompt, // REQ-GEN-020: audio understanding via inline part (≤20MB)
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
          // A response that starts as valid JSON and simply stops is TRUNCATED, not malformed —
          // saying "non-JSON" sends you hunting for a prompt bug that is not there. The shot plan
          // grew when it started carrying a cast (REQ-STB-048), which made this reachable.
          const looksTruncated = /^[[{]/.test(jsonText) && !/[\]}]\s*$/.test(jsonText);
          throw new ProviderError(
            "output_unusable",
            `${looksTruncated ? "model output was cut off mid-JSON (response too long)" : "model returned non-JSON structured output"}: ${text.slice(0, 200)}`
          );
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
      // REQ-GEN-023: the omni route is synchronous Interactions REST (~22–31s), not the Veo op loop.
      if (r.model === omniVideoModel) {
        try {
          const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
            method: "POST",
            headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify(buildOmniVideoRequest(r)),
          });
          if (!res.ok) throw new ProviderError(res.status >= 500 ? "provider_unavailable" : "output_unusable", `interactions ${res.status}: ${(await res.text()).slice(0, 200)}`);
          const body = (await res.json()) as { steps?: Array<{ type: string; content?: Array<{ type: string; data?: string }> }> };
          const vid = body.steps?.flatMap((st) => (st.type === "model_output" ? st.content ?? [] : [])).find((c) => c.type === "video")?.data;
          if (!vid) throw new ProviderError("output_unusable", "no video block in interactions response");
          // Free-form durations honored via the prompt (10s verified 2026-07-24) — no snap here.
          return { bytes: new Uint8Array(Buffer.from(vid, "base64")), mime: "video/mp4", durationS: r.durationSeconds };
        } catch (e) {
          if (e instanceof ProviderError) throw e;
          throw mapGeminiError(e);
        }
      }
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
    async generateMusic(r) {
      // Lyria 3 via the Interactions API (REST — SDK does not wrap it yet). docs/85 §Music.
      try {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "Content-Type": "application/json" },
          body: JSON.stringify({ model: r.model, input: r.prompt, response_format: { type: "audio" } }),
        });
        if (!res.ok) throw new ProviderError(res.status >= 500 ? "provider_unavailable" : "output_unusable", `interactions ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const body = (await res.json()) as { steps?: Array<{ type: string; content?: Array<{ type: string; data?: string }> }> };
        const audio = body.steps?.flatMap((st) => (st.type === "model_output" ? st.content ?? [] : [])).find((c) => c.type === "audio")?.data;
        if (!audio) throw new ProviderError("output_unusable", "no audio block in interactions response");
        return { bytes: new Uint8Array(Buffer.from(audio, "base64")), mime: "audio/mpeg" };
      } catch (e) {
        if (e instanceof ProviderError) throw e;
        throw mapGeminiError(e);
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
