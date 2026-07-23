// REQ-GEN-002/003/006/010/015 — provider-agnostic executor: claim → provider call →
// storage/output → cost → terminal status. Providers: mock (fixtures), gemini, test stubs.
import { and, asc, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { providerLimits } from "@avd/shared/config";
import { asset } from "@avd/ast/schema";
import { assetKey, getObject, putObject } from "@avd/ast/storage";
import { computeCostUsd } from "./cost";
import { defaultProvider, ProviderError, type GenProvider } from "./provider";
import { generation } from "./schema";

const TEXT_KINDS = new Set(["script", "shot_plan", "direction", "music_brief"]);

/** REQ-AST-006: resolve entity ref asset ids to bytes for image conditioning (capped by provider limit). */
async function fetchRefImages(db: Db, ids?: string[]): Promise<{ refImages?: { bytes: Uint8Array; mime: string }[] }> {
  if (!ids?.length) return {};
  const rows = await db.select().from(asset).where(inArray(asset.id, ids.slice(0, providerLimits.image.maxReferenceImages)));
  const refImages: { bytes: Uint8Array; mime: string }[] = [];
  for (const a of rows) {
    if (a.status !== "ready" || a.kind !== "image") continue;
    const obj = await getObject(a.storageKey);
    refImages.push({ bytes: obj.bytes, mime: a.mime });
  }
  return refImages.length ? { refImages } : {};
}

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
  return processGenerationRow(db, next, opts.provider);
}

/** Executes a specific generation by id (worker path, REQ-GEN-016). */
export async function runGenerationById(
  db: Db,
  generationId: string,
  provider?: GenProvider
): Promise<RunResult | null> {
  const [row] = await db.select().from(generation).where(eq(generation.id, generationId));
  if (!row || row.status !== "queued") return null;
  return processGenerationRow(db, row, provider);
}

async function processGenerationRow(
  db: Db,
  next: typeof generation.$inferSelect,
  injectedProvider?: GenProvider
): Promise<RunResult> {
  await db.update(generation).set({ status: "running", startedAt: new Date() }).where(eq(generation.id, next.id));

  const provider = injectedProvider ?? defaultProvider();
  const snapshot = next.promptSnapshot as {
    prompt: string;
    refs?: { startFrameAssetId?: string; entityRefAssetIds?: string[]; editSourceAssetId?: string };
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
        meta: { ...snapshot.input, kind: next.kind },
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

    // REQ-GEN-009: fetch the selected start frame's bytes for image conditioning.
    let startFrame: { bytes: Uint8Array; mime: string } | undefined;
    if (isVideo && snapshot.refs?.startFrameAssetId) {
      const [frameAsset] = await db.select().from(asset).where(eq(asset.id, snapshot.refs.startFrameAssetId));
      if (frameAsset?.status === "ready") {
        const obj = await getObject(frameAsset.storageKey);
        startFrame = { bytes: obj.bytes, mime: frameAsset.mime };
      }
    }

    const media = isVideo
      ? await provider.generateVideo({
          model: next.modelId,
          prompt: snapshot.prompt,
          durationSeconds: params.durationSeconds ?? 0,
          aspectRatio,
          ...(startFrame ? { startFrame } : {}),
        })
      : await provider.generateImage({
          model: next.modelId,
          prompt: snapshot.prompt,
          aspectRatio,
          seed: assetId,
          label: `${next.kind} · ${assetId.slice(-6)} · ${provider.name}`,
          ...(await fetchRefImages(
            db,
            next.kind === "image_edit" && snapshot.refs?.editSourceAssetId
              ? [snapshot.refs.editSourceAssetId, ...(snapshot.refs?.entityRefAssetIds ?? [])] // source first (REQ-GEN-012)
              : snapshot.refs?.entityRefAssetIds
          )),
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
      durationS: isVideo ? String((media as unknown as { durationS: number }).durationS) : null,
      generationId: next.id, // INV-GEN-002: new immutable asset per generation
      editOf: next.kind === "image_edit" ? snapshot.refs?.editSourceAssetId ?? null : null, // lineage
    });

    await db
      .update(generation)
      .set({
        status: "succeeded",
        costUsd: computeCostUsd(next.kind, {
          ...(isVideo ? { durationSeconds: (media as unknown as { durationS: number }).durationS } : {}),
          ...(params.quality ? { quality: params.quality } : {}),
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
