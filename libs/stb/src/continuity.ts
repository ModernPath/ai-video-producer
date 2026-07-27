// REQ-STB-059 — continuity chains: sub-clips, tail-frame handoff, chained generation.

import { and, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { frameCandidate, shot, take } from "./schema";
import { project } from "@avd/prj/schema";
import { StbValidationError, getShotOrThrow } from "./common";
import { listShots } from "./shots";

// ---- Continuity chains (REQ-STB-054, USER 2026-07-27) ----

/**
 * "They should be considered as sub-clips for the main clip, so we can see the dependency."
 *
 * A shot that CONTINUES another is the same moment carried on: same bodies, same wardrobe, same
 * poses. A description cannot hold a pose — only the previous take's last frame can — so the link
 * is explicit and the handoff is mechanical.
 */
export async function setShotContinuity(
  db: Db,
  input: { shotId: string; continuesFromShotId: string | null }
): Promise<void> {
  const s = await getShotOrThrow(db, input.shotId);
  if (input.continuesFromShotId) {
    if (input.continuesFromShotId === input.shotId) {
      throw new StbValidationError("validation_failed", "A shot cannot continue itself");
    }
    const from = await getShotOrThrow(db, input.continuesFromShotId);
    if (from.projectId !== s.projectId) {
      throw new StbValidationError("validation_failed", "A shot can only continue another in the same project");
    }
    // Walk the chain: a cycle would make the handoff never terminate.
    let cursor: string | null = from.continuesFromShotId;
    while (cursor) {
      if (cursor === input.shotId) {
        throw new StbValidationError("validation_failed", "That would make a circular continuity chain");
      }
      const [next] = await db.select().from(shot).where(eq(shot.id, cursor));
      cursor = next?.continuesFromShotId ?? null;
    }
  }
  await db.update(shot).set({ continuesFromShotId: input.continuesFromShotId }).where(eq(shot.id, input.shotId));
}

/**
 * Hand the last frame of this shot's selected take to every shot that continues from it, as their
 * start frame. Returns the shot ids that received one.
 *
 * Idempotent: a shot that already has a start frame is left alone, so re-running after a re-select
 * does not stack candidates. Never throws on a missing tail — degrading to "no start frame" is
 * better than failing the take that produced it.
 */
export async function handoffTailFrame(
  db: Db,
  input: { shotId: string; force?: boolean }
): Promise<string[]> {
  const src = await getShotOrThrow(db, input.shotId);
  if (!src.selectedTakeId) return [];
  const followers = await db.select().from(shot)
    .where(and(eq(shot.continuesFromShotId, input.shotId), isNull(shot.deletedAt)));
  // Automatic handoff (on take selection) never clobbers a frame the user chose. An EXPLICIT link
  // is a request to replace it — that is what pressing "continue that shot" means.
  const pending = input.force ? followers : followers.filter((f) => !f.selectedStartFrameId);
  if (!pending.length) return [];

  const [t] = await db.select().from(take).where(eq(take.id, src.selectedTakeId));
  if (!t) return [];
  const { getObject } = await import("@avd/ast/storage");
  const [videoAsset] = await db.select().from(asset).where(eq(asset.id, t.videoAssetId));
  if (!videoAsset) return [];

  const { extractTailFrame } = await import("@avd/ast/tail-frame");
  const { uploadBytesDirect } = await import("@avd/ast");
  let bytes: Uint8Array | null = null;
  try {
    bytes = await extractTailFrame((await getObject(videoAsset.storageKey)).bytes); // getObject returns { bytes, mime }
  } catch {
    bytes = null; // an unreadable take must not fail the shot that produced it
  }
  if (!bytes) return [];

  const done: string[] = [];
  for (const f of pending) {
    const imageAssetId = await uploadBytesDirect(db, {
      organizationId: src.organizationId, projectId: src.projectId,
      kind: "image", mime: "image/jpeg", bytes,
    });
    const candidateId = uuidv7();
    await db.insert(frameCandidate).values({
      id: candidateId, shotId: f.id, slot: "start", imageAssetId, generationId: t.generationId,
    });
    // Retire the frame this replaces, so the shot does not offer two "start" frames.
    if (f.selectedStartFrameId) {
      await db.update(frameCandidate).set({ deletedAt: new Date() }).where(eq(frameCandidate.id, f.selectedStartFrameId));
    }
    await db.update(shot).set({ selectedStartFrameId: candidateId }).where(eq(shot.id, f.id));
    done.push(f.id);
  }
  return done;
}

/**
 * REQ-STB-055 — request takes for a whole continuity chain, in order.
 *
 * Returns the generation ids in the order they must RUN. It deliberately does not run them: the
 * caller drains them one at a time and selects each take, because each shot's start frame only
 * exists once the shot before it has a chosen take. Enqueuing them all up front would hand every
 * follower an empty frame — the exact failure this requirement exists to prevent.
 */
export async function chainGenerationPlan(
  db: Db,
  input: { shotId: string }
): Promise<Array<{ shotId: string; title: string }>> {
  const s = await getShotOrThrow(db, input.shotId);
  const siblings = await listShots(db, s.projectId);
  const { chainOrder } = await import("./chain");
  const chain = chainOrder(
    siblings.map((x) => ({ id: x.id, title: x.title, position: x.position, continuesFromShotId: x.continuesFromShotId, selectedTakeId: x.selectedTakeId })),
    input.shotId
  );
  return chain.map((c) => ({ shotId: c.id, title: c.title }));
}
