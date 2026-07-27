import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { assetKey, putObject } from "@avd/ast/storage";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import { createShot, materializeGenerationOutput, requestTake, selectTake } from "@avd/stb";
import { frameCandidate, shot, take } from "@avd/stb/schema";
import { AsmValidationError, createSnapshot, queueExport, retryExport, runExportById } from "../src/service";
import { exportJob, storyboardSnapshot } from "../src/schema";
import { migrate } from "@avd/shared/migrate";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// REQ-ASM-006 / INV-ASM-004 — failed exports keep their error and retry as a new job.
describe("ASM export retry", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  let takeAssetId: string;
  let goodKey: string;

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "ExpRetry Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "ExpRetry", aspectRatio: "16:9", targetDurationS: "10",
    });
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "one", durationS: 6,
      direction: { synopsis: "s", subject: "x", action: "a" },
    });
    const g = await requestTake(db, { shotId, principal: "u", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    const m = await materializeGenerationOutput(db, g);
    await selectTake(db, { shotId, takeId: m!.id });
    const [t] = await db.select().from(take).where(eq(take.id, m!.id));
    takeAssetId = t!.videoAssetId;
    const [a] = await db.select().from(asset).where(eq(asset.id, takeAssetId));
    goodKey = a!.storageKey;
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

  it("failure keeps error; retry after fix succeeds against the SAME snapshot; failed job untouched", async () => {
    // break the asset's storage key so the export fetch fails
    await db.update(asset).set({ storageKey: "broken/nowhere.mp4" }).where(eq(asset.id, takeAssetId));
    const snapId = await createSnapshot(db, { projectId, principal: "u" });
    const jobId = await queueExport(db, { projectId, snapshotId: snapId, principal: "u" });
    const r1 = await runExportById(db, jobId);
    expect(r1?.status).toBe("failed");
    const [failed] = await db.select().from(exportJob).where(eq(exportJob.id, jobId));
    expect(failed?.errorDetail).toBeTruthy(); // INV-ASM-004

    // fix the cause, retry
    await db.update(asset).set({ storageKey: goodKey }).where(eq(asset.id, takeAssetId));
    const retryJobId = await retryExport(db, { exportJobId: jobId, principal: "u" });
    const r2 = await runExportById(db, retryJobId);
    expect(r2?.status).toBe("succeeded");
    const [retryJob] = await db.select().from(exportJob).where(eq(exportJob.id, retryJobId));
    expect(retryJob?.snapshotId).toBe(snapId); // same immutable snapshot
    const [failedAfter] = await db.select().from(exportJob).where(eq(exportJob.id, jobId));
    expect(failedAfter?.status).toBe("failed"); // history preserved
  }, 120_000);

  it("retrying a succeeded job is rejected", async () => {
    const [ok] = await db.select().from(exportJob).where(eq(exportJob.status, "succeeded"));
    await expect(retryExport(db, { exportJobId: ok!.id, principal: "u" })).rejects.toThrow(AsmValidationError);
  });
});
