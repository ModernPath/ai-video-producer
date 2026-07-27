import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { getObject } from "@avd/ast/storage";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import {
  createShot, listShots, materializeGenerationOutput, requestTake, selectTake,
} from "@avd/stb";
import { frameCandidate, shot, take } from "@avd/stb/schema";
import { AsmValidationError, createSnapshot, runNextExport } from "../src/service";
import { exportJob, storyboardSnapshot } from "../src/schema";
import { migrate } from "@avd/shared/migrate";

// REQ-ASM-001..003 — requires compose postgres + minio + docker (ffmpeg image).
describe("ASM: snapshot -> export -> downloadable asset", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  async function makeGeneratedShot(title: string, durationS: number) {
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title, durationS,
      direction: { synopsis: title, subject: "s", action: "a" },
    });
    const genId = await requestTake(db, { shotId, principal: "user:test", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    const m = await materializeGenerationOutput(db, genId);
    await selectTake(db, { shotId, takeId: m!.id });
    return shotId;
  }

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "ASM Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "ASM Slice", aspectRatio: "16:9", targetDurationS: "30",
    });
  }, 60_000);

  afterAll(async () => {
    await db.delete(exportJob).where(eq(exportJob.projectId, projectId));
    await db.delete(storyboardSnapshot).where(eq(storyboardSnapshot.projectId, projectId));
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

  it("REQ-ASM-001: rejects snapshot while a shot lacks a selected take", async () => {
    await createShot(db, {
      organizationId: orgId, projectId, title: "no take yet", durationS: 5,
      direction: { synopsis: "x", subject: "s", action: "a" },
    });
    await expect(createSnapshot(db, { projectId, principal: "user:test" }))
      .rejects.toThrow(/no take yet/);
    // finish it so later tests can snapshot
    const rows = await listShots(db, projectId);
    const s = rows.find((r) => r.title === "no take yet")!;
    const genId = await requestTake(db, { shotId: s.id, principal: "user:test", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    const m = await materializeGenerationOutput(db, genId);
    await selectTake(db, { shotId: s.id, takeId: m!.id });
  }, 60_000);

  it("REQ-ASM-001: snapshot captures order and survives later selection changes", async () => {
    await makeGeneratedShot("second", 6);
    const snapId = await createSnapshot(db, { projectId, principal: "user:test" });
    const [snap] = await db.select().from(storyboardSnapshot).where(eq(storyboardSnapshot.id, snapId));
    const items = snap!.items as Array<{ shotId: string; videoAssetId: string }>;
    expect(items.length).toBe(2);
    const before = JSON.stringify(items);
    // change a selection afterwards -> snapshot unchanged
    const rows = await listShots(db, projectId);
    const s0 = rows[0]!;
    const genId = await requestTake(db, { shotId: s0.id, principal: "user:test", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    const m = await materializeGenerationOutput(db, genId);
    await selectTake(db, { shotId: s0.id, takeId: m!.id });
    const [snapAfter] = await db.select().from(storyboardSnapshot).where(eq(storyboardSnapshot.id, snapId));
    expect(JSON.stringify(snapAfter!.items)).toBe(before);
  }, 60_000);

  it("REQ-ASM-002/003: export concatenates to a downloadable ready MP4 asset", async () => {
    const snapId = await createSnapshot(db, { projectId, principal: "user:test" });
    const jobId = await (await import("../src/service")).queueExport(db, {
      projectId, snapshotId: snapId, principal: "user:test",
    });
    const result = await runNextExport(db, { organizationId: orgId });
    expect(result?.status).toBe("succeeded");
    const [job] = await db.select().from(exportJob).where(eq(exportJob.id, jobId));
    expect(job?.status).toBe("succeeded");
    const [out] = await db.select().from(asset).where(eq(asset.id, job!.outputAssetId!));
    expect(out?.status).toBe("ready");
    expect(out?.kind).toBe("video");
    const obj = await getObject(out!.storageKey);
    expect(Buffer.from(obj.bytes.slice(4, 8)).toString("ascii")).toBe("ftyp");
    // concat evidence: bigger than one fixture clip (~1MB)
    expect(obj.bytes.byteLength).toBeGreaterThan(1_200_000);
  }, 120_000);
});
