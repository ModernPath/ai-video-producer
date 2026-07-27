import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset, entity, projectEntity } from "@avd/ast/schema";
import { attachEntities, createEntity } from "@avd/ast";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import {
  applyShotPlan, draftScript, materializeGenerationOutput, proposeShotPlan, requestFrame, updateShotRefs,
} from "../src/service";
import { frameCandidate, scriptVersion, shot, shotPlanProposal, take } from "../src/schema";
import { migrate } from "@avd/shared/migrate";

// REQ-STB-016 (per-shot refs) + REQ-STB-017 (first frames on apply).
describe("STB per-shot refs + first frames on apply", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  const refA = uuidv7();
  const refB = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Refs Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Refs Proj", aspectRatio: "16:9", targetDurationS: "18",
      brief: { idea: "test" },
    });
    for (const id of [refA, refB]) {
      await db.insert(asset).values({
        id, organizationId: orgId, kind: "image", source: "uploaded",
        status: "ready", storageKey: `t/${id}.png`, mime: "image/png", bytes: 5,
      });
    }
    const e1 = await createEntity(db, { organizationId: orgId, kind: "product", name: "Can", description: "d", refAssetIds: [refA] });
    const e2 = await createEntity(db, { organizationId: orgId, kind: "person", name: "Mika", description: "d", refAssetIds: [refB] });
    await attachEntities(db, { projectId, entityIds: [e1, e2] });
    const g = await draftScript(db, { projectId, principal: "u" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, g);
  });
  afterAll(async () => {
    const shotIds = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
    if (shotIds.length) {
      await db.delete(take).where(inArray(take.shotId, shotIds));
      await db.delete(frameCandidate).where(inArray(frameCandidate.shotId, shotIds));
    }
    await db.delete(shot).where(eq(shot.projectId, projectId));
    await db.delete(shotPlanProposal).where(eq(shotPlanProposal.projectId, projectId));
    await db.delete(scriptVersion).where(eq(scriptVersion.projectId, projectId));
    await db.delete(projectEntity).where(eq(projectEntity.projectId, projectId));
    await db.delete(entity).where(eq(entity.organizationId, orgId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("REQ-STB-017: applyShotPlan returns created shot ids in order (for one-gesture first frames)", async () => {
    const g = await proposeShotPlan(db, { projectId, principal: "u" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, g);
    const [proposal] = await db.select().from(shotPlanProposal).where(eq(shotPlanProposal.projectId, projectId));
    const shotIds = await applyShotPlan(db, { proposalId: proposal!.id, principal: "u" });
    expect(shotIds.length).toBeGreaterThanOrEqual(3);
    const rows = await db.select().from(shot).where(inArray(shot.id, shotIds));
    expect(rows.length).toBe(shotIds.length);
  });

  it("REQ-STB-016: per-shot ref subset overrides the whole-cast default", async () => {
    const [s0] = await db.select().from(shot).where(eq(shot.projectId, projectId));
    // default: whole cast (refA + refB)
    const gDefault = await requestFrame(db, { shotId: s0!.id, slot: "start", principal: "u", aspectRatio: "16:9" });
    const [gd] = await db.select().from(generation).where(eq(generation.id, gDefault));
    const defaultRefs = (gd!.promptSnapshot as { refAssetIds: string[] }).refAssetIds;
    expect(defaultRefs).toEqual(expect.arrayContaining([refA, refB]));

    // subset: only refB
    await updateShotRefs(db, { shotId: s0!.id, refAssetIds: [refB] });
    const gSub = await requestFrame(db, { shotId: s0!.id, slot: "start", principal: "u", aspectRatio: "16:9" });
    const [gs] = await db.select().from(generation).where(eq(generation.id, gSub));
    const subsetRefs = (gs!.promptSnapshot as { refAssetIds: string[] }).refAssetIds;
    expect(subsetRefs).toContain(refB);
    expect(subsetRefs).not.toContain(refA);

    // clear -> back to cast default
    await updateShotRefs(db, { shotId: s0!.id, refAssetIds: null });
    const gBack = await requestFrame(db, { shotId: s0!.id, slot: "start", principal: "u", aspectRatio: "16:9" });
    const [gb] = await db.select().from(generation).where(eq(generation.id, gBack));
    expect((gb!.promptSnapshot as { refAssetIds: string[] }).refAssetIds).toEqual(expect.arrayContaining([refA, refB]));
  });
});
