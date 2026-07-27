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
  applyShotPlan, draftScript, listShots, materializeGenerationOutput, proposeShotPlan, requestFrame,
} from "../src/service";
import { frameCandidate, scriptVersion, shot, shotPlanProposal, take } from "../src/schema";
import { migrate } from "../../../scripts/migrate";
import { normalizePlannedShots } from "../src/plan-normalize";

// REQ-STB-014 — the plan authors ready image/video prompts per shot.
describe("STB plan-authored scripts", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "PlanScripts Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "PlanScripts", aspectRatio: "16:9", targetDurationS: "18",
      brief: { idea: "dawn espresso ritual with the KAIJU Can" },
    });
    const refId = uuidv7();
    await db.insert(asset).values({
      id: refId, organizationId: orgId, kind: "image", source: "uploaded",
      status: "ready", storageKey: "t/r.png", mime: "image/png", bytes: 5,
    });
    const eid = await createEntity(db, {
      organizationId: orgId, kind: "product", name: "KAIJU Can", description: "green can", refAssetIds: [refId],
    });
    await attachEntities(db, { projectId, entityIds: [eid] });
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

  it("proposal shots carry authored imagePrompt+videoPrompt; apply sets them; generation uses them verbatim", async () => {
    const g = await proposeShotPlan(db, { projectId, principal: "u" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, g);
    const [proposal] = await db.select().from(shotPlanProposal).where(eq(shotPlanProposal.projectId, projectId));
    // REQ-STB-048: `changes` now holds { shots, cast }; read it the way production does, so this
    // test asserts on the plan rather than on one storage shape.
    const planned = normalizePlannedShots(proposal!.changes);
    expect(planned.length).toBeGreaterThanOrEqual(3);
    for (const ps of planned) {
      expect((ps.imagePrompt ?? "").length).toBeGreaterThan(20);
      expect((ps.videoPrompt ?? "").length).toBeGreaterThan(20);
    }

    await applyShotPlan(db, { proposalId: proposal!.id, principal: "u" });
    const rows = await listShots(db, projectId);
    expect(rows[0]?.imagePrompt).toBe(planned[0]!.imagePrompt);
    expect(rows[0]?.videoPrompt).toBe(planned[0]!.videoPrompt);

    const fg = await requestFrame(db, { shotId: rows[0]!.id, slot: "start", principal: "u", aspectRatio: "16:9" });
    const [gen] = await db.select().from(generation).where(eq(generation.id, fg));
    expect((gen!.promptSnapshot as { prompt: string }).prompt.startsWith(planned[0]!.imagePrompt!)).toBe(true);
  });
});
