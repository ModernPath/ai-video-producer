// REQ-GEN-015 (mock path) + REQ-GEN-002 (new immutable asset) + REQ-GEN-003 (cost on completion).
// Real provider path lands with REQ-GEN-010.
import { asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { asset } from "@avd/ast/schema";
import { computeCostUsd } from "./cost";
import { generation } from "./schema";
import { mockEnabled } from "./service";

const assetKindFor = { frame: "image", image_edit: "image", take: "video", retake: "video" } as const;

export interface RunResult {
  generationId: string;
  status: "succeeded" | "failed";
}

/** Claims the oldest queued generation and executes it. Returns null when the queue is empty. */
export async function runNextGeneration(db: Db): Promise<RunResult | null> {
  const [next] = await db
    .select()
    .from(generation)
    .where(eq(generation.status, "queued"))
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

  const kind = next.kind as keyof typeof assetKindFor;
  const mediaKind = assetKindFor[kind] ?? "image";
  const params = next.params as { durationSeconds?: number };
  const assetId = uuidv7();

  await db.insert(asset).values({
    id: assetId,
    organizationId: next.organizationId,
    projectId: next.projectId,
    kind: mediaKind,
    source: "generated",
    status: "ready",
    storageKey: `fixture://${mediaKind}/${assetId}`, // real object storage lands with AST slice
    mime: mediaKind === "video" ? "video/mp4" : "image/png",
    durationS: mediaKind === "video" ? String(params.durationSeconds ?? 0) : null,
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
