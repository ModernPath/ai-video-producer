import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import { createShot, materializeGenerationOutput, requestTake, selectTake } from "@avd/stb";
import { frameCandidate, shot, take } from "@avd/stb/schema";
import { AsmValidationError, createSnapshot, queueExport, runExportById } from "../src/service";
import { createShareLink, resolveShareToken, revokeShareLink } from "../src/share";
import { exportJob, shareLink, storyboardSnapshot } from "../src/schema";
import { migrate } from "@avd/shared/migrate";

// REQ-ASM-007 / INV-ASM-005 — share links grant access only to the linked export's
// output: token-scoped, revocable, optional expiry.
describe("REQ-ASM-007: share links", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  let succeededJobId: string;
  let queuedJobId: string;
  let failedJobId: string;
  let outputAssetId: string;

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Share Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "ShareProj", aspectRatio: "16:9", targetDurationS: "10",
    });
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "one", durationS: 6,
      direction: { synopsis: "s", subject: "x", action: "a" },
    });
    const g = await requestTake(db, { shotId, principal: "u", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    const m = await materializeGenerationOutput(db, g);
    await selectTake(db, { shotId, takeId: m!.id });

    const snapId = await createSnapshot(db, { projectId, principal: "u" });
    succeededJobId = await queueExport(db, { projectId, snapshotId: snapId, principal: "u" });
    const r = await runExportById(db, succeededJobId);
    expect(r?.status).toBe("succeeded");
    const [okJob] = await db.select().from(exportJob).where(eq(exportJob.id, succeededJobId));
    outputAssetId = okJob!.outputAssetId!;

    // a queued job (never run) and a failed job (broken asset key) for rejection cases
    queuedJobId = await queueExport(db, { projectId, snapshotId: snapId, principal: "u" });
    failedJobId = await queueExport(db, { projectId, snapshotId: snapId, principal: "u" });
    const [t] = await db.select().from(take).where(eq(take.shotId, shotId));
    const goodKeyRow = await db.select().from(asset).where(eq(asset.id, t!.videoAssetId));
    const goodKey = goodKeyRow[0]!.storageKey;
    await db.update(asset).set({ storageKey: "broken/nowhere.mp4" }).where(eq(asset.id, t!.videoAssetId));
    const rf = await runExportById(db, failedJobId);
    expect(rf?.status).toBe("failed");
    await db.update(asset).set({ storageKey: goodKey }).where(eq(asset.id, t!.videoAssetId));
  }, 120_000);

  afterAll(async () => {
    const jobIds = (await db.select().from(exportJob).where(eq(exportJob.projectId, projectId))).map((j) => j.id);
    if (jobIds.length) await db.delete(shareLink).where(inArray(shareLink.exportJobId, jobIds));
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

  it("creates a link for a succeeded export with a url-safe token of 32+ chars", async () => {
    const link = await createShareLink(db, { exportJobId: succeededJobId });
    expect(link.token.length).toBeGreaterThanOrEqual(config.asm.share.tokenBytes); // 24 bytes → 32 b64url chars
    expect(link.token.length).toBeGreaterThanOrEqual(32);
    expect(link.token).toMatch(/^[A-Za-z0-9_-]+$/); // url-safe, no escaping needed in /s/<token>
    const [row] = await db.select().from(shareLink).where(eq(shareLink.id, link.id));
    expect(row?.exportJobId).toBe(succeededJobId);
    expect(row?.revokedAt).toBeNull();
  });

  it("rejects share links for queued and failed exports (only succeeded outputs are shareable)", async () => {
    await expect(createShareLink(db, { exportJobId: queuedJobId })).rejects.toThrow(AsmValidationError);
    await expect(createShareLink(db, { exportJobId: failedJobId })).rejects.toThrow(AsmValidationError);
    await expect(createShareLink(db, { exportJobId: uuidv7() })).rejects.toThrow(AsmValidationError);
  });

  it("resolves a valid token to the export job and its output asset (token-scoped)", async () => {
    const link = await createShareLink(db, { exportJobId: succeededJobId });
    const resolved = await resolveShareToken(db, link.token);
    expect(resolved).not.toBeNull();
    expect(resolved!.exportJob.id).toBe(succeededJobId);
    expect(resolved!.outputAssetId).toBe(outputAssetId); // INV-ASM-005: only the linked export's output
  });

  it("resolves null after revoke, when expired, and for unknown tokens", async () => {
    const link = await createShareLink(db, { exportJobId: succeededJobId });
    await revokeShareLink(db, { shareLinkId: link.id });
    expect(await resolveShareToken(db, link.token)).toBeNull(); // revoked

    const expired = await createShareLink(db, {
      exportJobId: succeededJobId, expiresAt: new Date(Date.now() - 1000),
    });
    expect(await resolveShareToken(db, expired.token)).toBeNull(); // expired

    expect(await resolveShareToken(db, "not-a-real-token-at-all-000000000")).toBeNull(); // unknown
  });
});
