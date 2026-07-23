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
  StbValidationError, createShot, listCandidates, materializeGenerationOutput,
  removeFrameCandidate, removeTake, requestFrame, requestTake, selectFrame, selectTake,
} from "../src/service";
import { frameCandidate, shot, take } from "../src/schema";
import { migrate } from "../../../scripts/migrate";

// REQ-STB-009 — user requirement #4 removal arm.
describe("STB candidate removal", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  let shotId: string;
  let frameA: string, frameB: string, takeA: string, takeB: string;

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Remove Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Remove Proj", aspectRatio: "16:9", targetDurationS: "30",
    });
    shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "s", durationS: 6,
      direction: { synopsis: "s", subject: "x", action: "a" },
    });
    for (let i = 0; i < 2; i++) {
      const gf = await requestFrame(db, { shotId, slot: "start", principal: "u", aspectRatio: "16:9" });
      await runNextGeneration(db, { organizationId: orgId });
      await materializeGenerationOutput(db, gf);
      const gt = await requestTake(db, { shotId, principal: "u", aspectRatio: "16:9" });
      await runNextGeneration(db, { organizationId: orgId });
      await materializeGenerationOutput(db, gt);
    }
    const c = await listCandidates(db, shotId);
    [frameA, frameB] = c.frames.map((f) => f.id) as [string, string];
    [takeA, takeB] = c.takes.map((t) => t.id) as [string, string];
    await selectFrame(db, { shotId, frameCandidateId: frameA });
    await selectTake(db, { shotId, takeId: takeA });
  }, 60_000);

  afterAll(async () => {
    await db.delete(take).where(eq(take.shotId, shotId));
    await db.delete(frameCandidate).where(eq(frameCandidate.shotId, shotId));
    await db.delete(shot).where(eq(shot.projectId, projectId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("removes unselected candidates softly; assets stay ready; strips exclude them", async () => {
    await removeFrameCandidate(db, { frameCandidateId: frameB });
    await removeTake(db, { takeId: takeB });
    const c = await listCandidates(db, shotId);
    expect(c.frames.map((f) => f.id)).toEqual([frameA]);
    expect(c.takes.map((t) => t.id)).toEqual([takeA]);
    const [fb] = await db.select().from(frameCandidate).where(eq(frameCandidate.id, frameB));
    expect(fb?.deletedAt).toBeTruthy(); // soft
    const [fbAsset] = await db.select().from(asset).where(eq(asset.id, fb!.imageAssetId));
    expect(fbAsset?.status).toBe("ready"); // INV-AST-003: storage retained
  });

  it("rejects removing selected candidates (conflict), state unchanged", async () => {
    await expect(removeFrameCandidate(db, { frameCandidateId: frameA })).rejects.toThrow(StbValidationError);
    await expect(removeTake(db, { takeId: takeA })).rejects.toThrow(/selected/);
    const c = await listCandidates(db, shotId);
    expect(c.frames.length).toBe(1);
    expect(c.takes.length).toBe(1);
  });
});
