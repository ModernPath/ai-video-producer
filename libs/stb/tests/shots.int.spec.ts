import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import {
  StbValidationError, createShot, listShots, materializeGenerationOutput,
  requestFrame, requestTake, selectTake,
} from "../src/service";
import { frameCandidate, shot, take } from "../src/schema";
import { migrate } from "../../../scripts/migrate";

describe("STB golden-thread slice (REQ-STB-001..004)", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  const base = {
    organizationId: orgId,
    projectId,
    direction: { synopsis: "s", subject: "x", action: "y" },
  };

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "STB Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "STB Slice", aspectRatio: "16:9", targetDurationS: "30",
    });
  });
  afterAll(async () => {
    // scope cleanup to this suite's rows — an unscoped delete wipes the shared dev DB (learned 2026-07-23)
    const shotIds = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
    if (shotIds.length) {
      await db.delete(take).where(inArray(take.shotId, shotIds));
      await db.delete(frameCandidate).where(inArray(frameCandidate.shotId, shotIds));
    }
    await db.delete(shot).where(eq(shot.projectId, projectId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("REQ-STB-001: rejects out-of-bounds durations, accepts in-bounds", async () => {
    await expect(createShot(db, { ...base, title: "bad", durationS: 3 })).rejects.toThrow(StbValidationError);
    await expect(createShot(db, { ...base, title: "bad", durationS: 11 })).rejects.toThrow(/between 4 and 10/);
    const id = await createShot(db, { ...base, title: "ok", durationS: 6.5 });
    expect(id).toBeTruthy();
  });

  it("REQ-STB-002: shots append in strict order", async () => {
    await createShot(db, { ...base, title: "second", durationS: 5 });
    const rows = await listShots(db, projectId);
    expect(rows.map((r) => r.position)).toEqual([1, 2]);
    expect(rows[0]?.title).toBe("ok");
  });

  it("golden thread: frame + take generate and materialize as candidates", async () => {
    const rows = await listShots(db, projectId);
    const shotId = rows[0]!.id;
    const genFrame = await requestFrame(db, { shotId, slot: "start", principal: "user:test", aspectRatio: "16:9" });
    const genTake = await requestTake(db, { shotId, principal: "user:test", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    await runNextGeneration(db, { organizationId: orgId });
    const f = await materializeGenerationOutput(db, genFrame);
    const t = await materializeGenerationOutput(db, genTake);
    expect(f?.kind).toBe("frame");
    expect(t?.kind).toBe("take");
  });

  it("REQ-STB-003/004: selecting a ready take sets single selection; unready rejected", async () => {
    const rows = await listShots(db, projectId);
    const shotId = rows[0]!.id;
    const [t] = await db.select().from(take).where(eq(take.shotId, shotId));
    await selectTake(db, { shotId, takeId: t!.id });
    let [s] = await db.select().from(shot).where(eq(shot.id, shotId));
    expect(s?.selectedTakeId).toBe(t!.id);

    // unready take: fabricate one with a pending asset
    const pendingAssetId = uuidv7();
    await db.insert(asset).values({
      id: pendingAssetId, organizationId: orgId, projectId, kind: "video",
      source: "generated", status: "pending", storageKey: "fixture://x", mime: "video/mp4",
    });
    const badTakeId = uuidv7();
    await db.insert(take).values({ id: badTakeId, shotId, videoAssetId: pendingAssetId, generationId: t!.generationId });
    await expect(selectTake(db, { shotId, takeId: badTakeId })).rejects.toThrow(/not ready/);
    [s] = await db.select().from(shot).where(eq(shot.id, shotId));
    expect(s?.selectedTakeId).toBe(t!.id); // selection unchanged (INV-STB-003)
  });
});
