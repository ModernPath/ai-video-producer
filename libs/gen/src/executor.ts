// REQ-GEN-002/003/006/010/015 — provider-agnostic executor: claim → provider call →
// storage/output → cost → terminal status. Providers: mock (fixtures), gemini, test stubs.
import { and, asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { asset } from "@avd/ast/schema";
import { assetKey, putObject } from "@avd/ast/storage";
import { computeCostUsd } from "./cost";
import { defaultProvider, ProviderError, type GenProvider } from "./provider";
import { generation } from "./schema";

const TEXT_KINDS = new Set(["script", "shot_plan", "direction", "music_brief"]);

export interface RunResult {
  generationId: string;
  status: "succeeded" | "failed";
}

/** Claims the oldest queued generation (optionally org-scoped) and executes it via the provider. */
export async function runNextGeneration(
  db: Db,
  opts: { organizationId?: string; provider?: GenProvider } = {}
): Promise<RunResult | null> {
  const scope = opts.organizationId
    ? and(eq(generation.status, "queued"), eq(generation.organizationId, opts.organizationId))
    : eq(generation.status, "queued");
  const [next] = await db.select().from(generation).where(scope).orderBy(asc(generation.createdAt)).limit(1);
  if (!next) return null;

  await db.update(generation).set({ status: "running", startedAt: new Date() }).where(eq(generation.id, next.id));

  const provider = opts.provider ?? defaultProvider();
  const snapshot = next.promptSnapshot as {
    prompt: string;
    input?: { aspectRatio?: "16:9" | "9:16" } & Record<string, unknown>;
  };
  const params = next.params as { durationSeconds?: number; quality?: "draft" | "standard" | "hero" };
  const aspectRatio = snapshot.input?.aspectRatio ?? "16:9";

  try {
    if (TEXT_KINDS.has(next.kind)) {
      const res = await provider.generateText({
        model: next.modelId,
        prompt: snapshot.prompt,
        json: next.kind === "shot_plan",
        meta: snapshot.input,
      });
      const output = res.json ? (res.json as Record<string, unknown>) : { text: res.text ?? "" };
      await db
        .update(generation)
        .set({
          status: "succeeded",
          output,
          costUsd: computeCostUsd(next.kind, { mock: !provider.billsCost }).toFixed(4),
          finishedAt: new Date(),
        })
        .where(eq(generation.id, next.id));
      return { generationId: next.id, status: "succeeded" };
    }

    const isVideo = next.kind === "take" || next.kind === "retake";
    const assetId = uuidv7();
    const media = isVideo
      ? await provider.generateVideo({
          model: next.modelId,
          prompt: snapshot.prompt,
          durationSeconds: params.durationSeconds ?? 0,
          aspectRatio,
        })
      : await provider.generateImage({
          model: next.modelId,
          prompt: snapshot.prompt,
          aspectRatio,
          seed: assetId,
          label: `${next.kind} · ${assetId.slice(-6)} · ${provider.name}`,
        });

    const ext = media.mime === "video/mp4" ? "mp4" : media.mime === "image/svg+xml" ? "svg" : "png";
    const key = assetKey(next.organizationId, next.projectId, assetId, ext);
    await putObject(key, media.bytes, media.mime); // REQ-AST-002: real bytes always

    await db.insert(asset).values({
      id: assetId,
      organizationId: next.organizationId,
      projectId: next.projectId,
      kind: isVideo ? "video" : "image",
      source: "generated",
      status: "ready",
      storageKey: key,
      mime: media.mime,
      bytes: media.bytes.byteLength,
      durationS: isVideo ? String((media as { durationS: number }).durationS) : null,
      generationId: next.id, // INV-GEN-002: new immutable asset per generation
    });

    await db
      .update(generation)
      .set({
        status: "succeeded",
        costUsd: computeCostUsd(next.kind, {
          durationSeconds: isVideo ? (media as { durationS: number }).durationS : undefined,
          quality: params.quality,
          mock: !provider.billsCost,
        }).toFixed(4), // INV-GEN-003
        outputAssetIds: [assetId],
        finishedAt: new Date(),
      })
      .where(eq(generation.id, next.id));
    return { generationId: next.id, status: "succeeded" };
  } catch (err) {
    const pe = err instanceof ProviderError ? err : new ProviderError("provider_unavailable", String(err));
    await db
      .update(generation)
      .set({
        status: "failed", // INV-GEN-006: terminal, no silent retry
        errorCode: pe.code,
        errorDetail: pe.message,
        finishedAt: new Date(),
      })
      .where(eq(generation.id, next.id));
    return { generationId: next.id, status: "failed" };
  }
}
