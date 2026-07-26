// REQ-GEN-002/003/006/010/011/015 — provider-agnostic executor: claim → provider call →
// storage/output → cost → terminal status. Providers: mock (fixtures), gemini, test stubs.
import { and, asc, count, eq, inArray, lt } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config, fullFrameAnimationTemplates, omniVideoModel, providerLimits, type FullFrameAnimationTemplate } from "@avd/shared/config";
import { asset } from "@avd/ast/schema";
import { assetKey, getObject, putObject } from "@avd/ast/storage";
import { makeAssetThumb } from "@avd/ast";
import { computeCostUsd } from "./cost";
import { mockEnabled } from "./service";
import { defaultProvider, ProviderError, type GenProvider } from "./provider";
import { generation } from "./schema";

const TEXT_KINDS = new Set(["script", "shot_plan", "direction", "music_brief", "transcript"]);
const VIDEO_KINDS = ["take", "retake"] as const;

function isVideoKind(kind: string): boolean {
  return (VIDEO_KINDS as readonly string[]).includes(kind);
}

/**
 * BR-GEN-005 (REQ-GEN-011): true when the org has a free video slot —
 * running take/retake generations below `config.gen.maxConcurrentVideoPerOrg`.
 */
async function videoSlotAvailable(db: Db, organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(generation)
    .where(
      and(
        eq(generation.organizationId, organizationId),
        eq(generation.status, "running"),
        inArray(generation.kind, [...VIDEO_KINDS])
      )
    );
  return Number(row?.n ?? 0) < config.gen.maxConcurrentVideoPerOrg; // BR-GEN-005: cap from config, never a literal
}

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
  await reapStaleGenerations(db); // REQ-GEN-022: recover orphans before claiming
  const scope = opts.organizationId
    ? and(eq(generation.status, "queued"), eq(generation.organizationId, opts.organizationId))
    : eq(generation.status, "queued");
  const queued = await db.select().from(generation).where(scope).orderBy(asc(generation.createdAt));
  const slotByOrg = new Map<string, boolean>();
  for (const next of queued) {
    if (isVideoKind(next.kind)) {
      let hasSlot = slotByOrg.get(next.organizationId);
      if (hasSlot === undefined) {
        hasSlot = await videoSlotAvailable(db, next.organizationId);
        slotByOrg.set(next.organizationId, hasSlot);
      }
      if (!hasSlot) continue; // BR-GEN-005: capped video jobs stay queued (FIFO); non-video kinds proceed
    }
    const result = await processGenerationRow(db, next, opts.provider);
    if (result) return result;
    // REQ-GEN-018: lost the claim race on this row — another runner has it; try the next one
  }
  return null;
}

/** REQ-GEN-022: fail rows stuck in `running` past the stale window — a crashed executor
 * otherwise leaves them occupying concurrency slots and spinning in the UI forever. */
export async function reapStaleGenerations(db: Db): Promise<number> {
  const cutoff = new Date(Date.now() - config.gen.staleRunningMinutes * 60_000);
  const stale = await db
    .select({ id: generation.id })
    .from(generation)
    .where(and(eq(generation.status, "running"), lt(generation.startedAt, cutoff)));
  for (const s of stale) {
    await db.update(generation).set({
      status: "failed",
      errorCode: "orphaned",
      errorDetail: `Generation ran past ${config.gen.staleRunningMinutes} minutes without finishing — the process running it likely died. Retry to regenerate.`,
      finishedAt: new Date(),
    }).where(and(eq(generation.id, s.id), eq(generation.status, "running")));
  }
  return stale.length;
}

/**
 * REQ-GEN-027 (USER 2026-07-26: "two videos seem stuck") — the same recovery as REQ-GEN-022, but
 * callable from a page load.
 *
 * `reapStaleGenerations` only ran inside `runNextGeneration`, i.e. when the user DISPATCHED NEW
 * WORK. Someone watching a stuck shot and waiting is exactly the person who never triggers that,
 * so two orphaned takes span "generating video…" for 38 minutes with no way out. Reading the
 * project is enough to recover it now. Safe to call anywhere: it only touches rows that started
 * before the stale window, so work genuinely in flight is untouched.
 */
export async function sweepStuckGenerations(db: Db): Promise<number> {
  return reapStaleGenerations(db);
}

/** Executes a specific generation by id (worker path, REQ-GEN-016). */
export async function runGenerationById(
  db: Db,
  generationId: string,
  provider?: GenProvider
): Promise<RunResult | null> {
  const [row] = await db.select().from(generation).where(eq(generation.id, generationId));
  if (!row || row.status !== "queued") return null;
  // BR-GEN-005 (REQ-GEN-011): capped video job stays queued — worker retry/backoff or a later dispatch claims it.
  if (isVideoKind(row.kind) && !(await videoSlotAvailable(db, row.organizationId))) return null;
  return processGenerationRow(db, row, provider);
}

/**
 * REQ-GEN-018 — atomic claim: flip queued → running ONLY if still queued, reporting whether
 * this caller won. The previous unconditional update let two runners that both read the same
 * queued row each execute it (double provider call, double cost) once worker count > 1.
 */
export async function claimGeneration(db: Db, generationId: string): Promise<boolean> {
  const claimed = await db
    .update(generation)
    .set({ status: "running", startedAt: new Date() })
    .where(and(eq(generation.id, generationId), eq(generation.status, "queued")))
    .returning({ id: generation.id });
  return claimed.length === 1;
}

async function processGenerationRow(
  db: Db,
  next: typeof generation.$inferSelect,
  injectedProvider?: GenProvider
): Promise<RunResult | null> {
  if (!(await claimGeneration(db, next.id))) return null; // REQ-GEN-018: another runner won this row

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
      // REQ-GEN-020: transcript carries an audio ref — fetch the track bytes for the model
      let audio: { bytes: Uint8Array; mime: string } | undefined;
      const audioAssetId = (snapshot.refs as { audioAssetId?: string } | undefined)?.audioAssetId;
      if (next.kind === "transcript" && audioAssetId) {
        const [track] = await db.select().from(asset).where(eq(asset.id, audioAssetId));
        if (track) audio = await getObject(track.storageKey);
      }
      const res = await provider.generateText({
        model: next.modelId,
        prompt: snapshot.prompt,
        json: next.kind === "shot_plan",
        audio,
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

    if (next.kind === "animation") {
      // REQ-ANM-001: local Remotion render — no provider, no cost. Mock mode uses the video fixture.
      const anmInput = snapshot.input as { text?: string; subtext?: string; customPrompt?: string; template?: string; durationSeconds?: number; aspectRatio?: "16:9" | "9:16" };
      const overlaySourceId = (snapshot.refs as { editSourceAssetId?: string } | undefined)?.editSourceAssetId;
      let media: { bytes: Uint8Array; mime: string; durationS: number };
      if (mockEnabled()) {
        media = await provider.generateVideo({ model: "mock", prompt: snapshot.prompt, durationSeconds: anmInput.durationSeconds ?? 4, aspectRatio });
      } else if (anmInput.template === "lower-third" && overlaySourceId) {
        // REQ-ANM-002: render alpha overlay, composite onto the source take via ffmpeg
        const { renderAnimation } = await import("@avd/anm");
        const { compositeOverlay } = await import("@avd/anm/composite");
        const [src] = await db.select().from(asset).where(eq(asset.id, overlaySourceId));
        if (!src) throw new Error("overlay source asset missing");
        const srcMedia = await getObject(src.storageKey);
        const overlay = await renderAnimation({
          template: "lower-third",
          text: anmInput.text ?? anmInput.customPrompt ?? "",
          durationS: anmInput.durationSeconds ?? 4,
          aspectRatio,
        });
        media = await compositeOverlay({
          videoBytes: srcMedia.bytes,
          overlayWebmBytes: overlay.bytes,
          durationS: anmInput.durationSeconds ?? 4,
        });
      } else {
        const { renderAnimation } = await import("@avd/anm");
        media = await renderAnimation({
          // REQ-ANM-006: dispatch every full-frame template (an unknown value falls back to title;
          // previously everything except "kinetic" was silently flattened to "title")
          template: (fullFrameAnimationTemplates as readonly string[]).includes(anmInput.template ?? "")
            ? (anmInput.template as FullFrameAnimationTemplate)
            : "title",
          text: anmInput.text ?? anmInput.customPrompt ?? "",
          subtext: (anmInput as { subtext?: string }).subtext,
          highlightWord: (anmInput as { highlightWord?: string }).highlightWord,
          // REQ-ANM-005: palette props reach the templates (defaults apply when absent)
          accent: (anmInput as { accent?: string }).accent,
          background: (anmInput as { background?: string }).background,
          durationS: anmInput.durationSeconds ?? 4,
          aspectRatio,
        });
      }
      const assetId = uuidv7();
      const key = assetKey(next.organizationId, next.projectId, assetId, "mp4");
      await putObject(key, media.bytes, media.mime);
      await db.insert(asset).values({
        id: assetId, organizationId: next.organizationId, projectId: next.projectId,
        kind: "video", source: "generated", status: "ready",
        storageKey: key, mime: media.mime, bytes: media.bytes.byteLength,
        durationS: String(media.durationS), generationId: next.id,
      });
      await db.update(generation).set({
        status: "succeeded", outputAssetIds: [assetId],
        costUsd: computeCostUsd(next.kind, {}).toFixed(4), finishedAt: new Date(),
      }).where(eq(generation.id, next.id));
      return { generationId: next.id, status: "succeeded" };
    }

    if (next.kind === "music") {
      // REQ-GEN-019: brief prompt verbatim -> full track; attaches downstream in STB materialize
      const media = await provider.generateMusic({ model: next.modelId, prompt: snapshot.prompt });
      const assetId = uuidv7();
      const key = assetKey(next.organizationId, next.projectId, assetId, "mp3");
      await putObject(key, media.bytes, media.mime);
      await db.insert(asset).values({
        id: assetId, organizationId: next.organizationId, projectId: next.projectId,
        kind: "audio", source: "generated", status: "ready",
        storageKey: key, mime: media.mime, bytes: media.bytes.byteLength,
        generationId: next.id,
      });
      // REQ-STB-039: persist the real track length so the timeline can show drift
      const { recordAssetDuration } = await import("@avd/ast/probe");
      await recordAssetDuration(db, assetId, media.bytes, "mp3");
      await db.update(generation).set({
        status: "succeeded",
        outputAssetIds: [assetId],
        costUsd: computeCostUsd(next.kind, { mock: !provider.billsCost }).toFixed(4),
        finishedAt: new Date(),
      }).where(eq(generation.id, next.id));
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
          // REQ-GEN-023: omni consumes entity refs as <IMAGE_REF_N>; Veo's SDK path ignores them.
          ...(next.modelId === omniVideoModel ? await fetchRefImages(db, snapshot.refs?.entityRefAssetIds) : {}),
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
    await makeAssetThumb(db, assetId); // REQ-AST-005: derivative on ready (failure-tolerant)

    await db
      .update(generation)
      .set({
        status: "succeeded",
        costUsd: computeCostUsd(next.kind, {
          ...(isVideo ? { durationSeconds: (media as unknown as { durationS: number }).durationS } : {}),
          ...(params.quality ? { quality: params.quality } : {}),
          mock: !provider.billsCost,
          model: next.modelId, // REQ-GEN-023: omni bills per video token
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
