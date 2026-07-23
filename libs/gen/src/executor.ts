// REQ-GEN-015 (mock path) + REQ-GEN-002 (new immutable asset) + REQ-GEN-003 (cost on completion).
// Real provider path lands with REQ-GEN-010.
import { and, asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { asset } from "@avd/ast/schema";
import { assetKey, putObject } from "@avd/ast/storage";
import { config } from "@avd/shared/config";
import { computeCostUsd } from "./cost";
import { fixtureMp4, fixtureScript, fixtureShotPlan, fixtureSvg } from "./fixtures";
import { generation } from "./schema";
import { mockEnabled } from "./service";

const assetKindFor = { frame: "image", image_edit: "image", take: "video", retake: "video" } as const;

export interface RunResult {
  generationId: string;
  status: "succeeded" | "failed";
}

/** Claims the oldest queued generation (optionally scoped to an org) and executes it. Returns null when the queue is empty. */
export async function runNextGeneration(db: Db, opts: { organizationId?: string } = {}): Promise<RunResult | null> {
  const scope = opts.organizationId
    ? and(eq(generation.status, "queued"), eq(generation.organizationId, opts.organizationId))
    : eq(generation.status, "queued");
  const [next] = await db
    .select()
    .from(generation)
    .where(scope)
    .orderBy(asc(generation.createdAt))
    .limit(1);
  if (!next) return null;

  await db
    .update(generation)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(generation.id, next.id));

  if (!mockEnabled()) {
    await db
      .update(generation)
      .set({ status: "failed", errorCode: "provider_unavailable", errorDetail: "real provider path pending REQ-GEN-010", finishedAt: new Date() })
      .where(eq(generation.id, next.id));
    return { generationId: next.id, status: "failed" };
  }

  // Text kinds: result lands on generation.output, no asset (docs/40 §5).
  if (next.kind === "script" || next.kind === "shot_plan" || next.kind === "music_brief" || next.kind === "direction") {
    const snap = next.promptSnapshot as { input?: { projectTitle?: string; brief?: Record<string, unknown>; targetDurationSeconds?: number } };
    const ti = {
      projectTitle: snap.input?.projectTitle ?? "Untitled",
      brief: snap.input?.brief ?? {},
      targetDurationSeconds: snap.input?.targetDurationSeconds ?? config.project.defaultTargetDurationSeconds,
    };
    const output =
      next.kind === "shot_plan"
        ? { shots: fixtureShotPlan({ ...ti, minS: config.shot.minSeconds, maxS: config.shot.maxSeconds }) }
        : { text: fixtureScript(ti) };
    await db
      .update(generation)
      .set({ status: "succeeded", output, costUsd: "0.0000", finishedAt: new Date() })
      .where(eq(generation.id, next.id));
    return { generationId: next.id, status: "succeeded" };
  }

  const kind = next.kind as keyof typeof assetKindFor;
  const mediaKind = assetKindFor[kind] ?? "image";
  const params = next.params as { durationSeconds?: number };
  const snapshot = next.promptSnapshot as { input?: { aspectRatio?: "16:9" | "9:16" } };
  const assetId = uuidv7();

  // REQ-AST-002: mock outputs are real media bytes in object storage.
  const isVideo = mediaKind === "video";
  const bytes = isVideo
    ? fixtureMp4()
    : fixtureSvg(assetId, `${next.kind} · ${assetId.slice(-6)} · mock`, snapshot.input?.aspectRatio ?? "16:9");
  const mime = isVideo ? "video/mp4" : "image/svg+xml";
  const key = assetKey(next.organizationId, next.projectId, assetId, isVideo ? "mp4" : "svg");
  await putObject(key, bytes, mime);

  await db.insert(asset).values({
    id: assetId,
    organizationId: next.organizationId,
    projectId: next.projectId,
    kind: mediaKind,
    source: "generated",
    status: "ready",
    storageKey: key,
    mime,
    bytes: bytes.byteLength,
    durationS: isVideo ? String(params.durationSeconds ?? 0) : null,
    generationId: next.id,
  });

  await db
    .update(generation)
    .set({
      status: "succeeded",
      costUsd: computeCostUsd(next.kind, { ...params, mock: true }).toFixed(4),
      outputAssetIds: [assetId],
      finishedAt: new Date(),
    })
    .where(eq(generation.id, next.id));

  return { generationId: next.id, status: "succeeded" };
}
