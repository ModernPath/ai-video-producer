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
import {
  applyShotPlan, draftScript, listShots, materializeGenerationOutput, proposeShotPlan,
} from "../src/service";
import { frameCandidate, scriptVersion, shot, shotPlanProposal, take } from "../src/schema";
import { migrate } from "@avd/shared/migrate";
import { normalizePlannedShots } from "../src/plan-normalize";

// REQ-STB-008 + REQ-STB-011 — mock-mode script studio flow.
describe("STB script studio: draft -> plan -> apply", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Script Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Wake the City", aspectRatio: "16:9", targetDurationS: "30",
      brief: { idea: "energy drink brand teaser at dawn", tone: "electric" },
    });
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
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("REQ-STB-008: draft creates immutable incrementing versions with provenance", async () => {
    const gen1 = await draftScript(db, { projectId, principal: "user:test" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, gen1);
    const [v1] = await db.select().from(scriptVersion).where(eq(scriptVersion.projectId, projectId));
    expect(v1?.version).toBe(1);
    expect(v1?.content).toContain("Wake the City");
    expect(v1?.generationId).toBe(gen1);

    const gen2 = await draftScript(db, { projectId, principal: "user:test" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, gen2);
    const versions = await db.select().from(scriptVersion).where(eq(scriptVersion.projectId, projectId));
    expect(versions.map((v) => v.version).sort()).toEqual([1, 2]);
    expect(versions.find((v) => v.version === 1)?.content).toBe(v1?.content);
  });

  it("REQ-STB-011: proposal has >=3 in-bounds shots; apply appends them in order", async () => {
    const genId = await proposeShotPlan(db, { projectId, principal: "user:test" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, genId);
    const [proposal] = await db.select().from(shotPlanProposal).where(eq(shotPlanProposal.projectId, projectId));
    expect(proposal).toBeTruthy();
    // REQ-STB-048: `changes` now holds { shots, cast } — read it through the normalizer.
    const shots = normalizePlannedShots(proposal!.changes);
    expect(shots.length).toBeGreaterThanOrEqual(3);
    for (const s of shots) {
      expect(s.durationS).toBeGreaterThanOrEqual(config.shot.minSeconds);
      expect(s.durationS).toBeLessThanOrEqual(config.shot.maxSeconds);
    }

    await applyShotPlan(db, { proposalId: proposal!.id, principal: "user:test" });
    const rows = await listShots(db, projectId);
    expect(rows.length).toBe(shots.length);
    expect(rows.map((r) => r.title)).toEqual(shots.map((s) => s.title));
    const [applied] = await db.select().from(shotPlanProposal).where(eq(shotPlanProposal.id, proposal!.id));
    expect(applied?.status).toBe("applied");
  });
});
