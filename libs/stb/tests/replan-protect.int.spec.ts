import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { asset } from "@avd/ast/schema";
import { applyShotPlan, createShot, listShots } from "../src/service";
import { frameCandidate, shot, shotPlanProposal, take } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();
const dir = { synopsis: "s", subject: "x", action: "y" };

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Replan Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Replan", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  const ids = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
  for (const sid of ids) {
    await db.delete(take).where(eq(take.shotId, sid));
    await db.delete(frameCandidate).where(eq(frameCandidate.shotId, sid));
  }
  await db.delete(shotPlanProposal).where(eq(shotPlanProposal.projectId, projectId));
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(asset).where(eq(asset.organizationId, orgId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-STB-007: applying a plan replaces unpaid shots, protects shots with takes (INV-STB-007)", () => {
  it("unpaid shots are replaced; a shot with a take survives; new shots appended", async () => {
    const plain1 = await createShot(db, { organizationId: orgId, projectId, title: "old plain 1", direction: dir, durationS: 4 });
    const plain2 = await createShot(db, { organizationId: orgId, projectId, title: "old plain 2", direction: dir, durationS: 4 });
    const paid = await createShot(db, { organizationId: orgId, projectId, title: "paid shot", direction: dir, durationS: 4 });
    const assetId = uuidv7();
    await db.insert(asset).values({
      id: assetId, organizationId: orgId, kind: "video", source: "generated", status: "ready",
      storageKey: `t/${assetId}.mp4`, mime: "video/mp4",
    });
    const genId = uuidv7();
    await db.insert(generation).values({
      id: genId, organizationId: orgId, projectId, kind: "take", target: {},
      modelId: "test-model-ref", promptSnapshot: { prompt: "p", templateVersion: 1, refAssetIds: [] },
      params: {}, status: "succeeded", commandId: uuidv7(), principal: "user:test",
    });
    await db.insert(take).values({ id: uuidv7(), shotId: paid, videoAssetId: assetId, generationId: genId });

    const proposalId = uuidv7();
    await db.insert(shotPlanProposal).values({
      id: proposalId, projectId, status: "proposed",
      changes: [
        { title: "new A", durationS: 4, direction: dir },
        { title: "new B", durationS: 6, direction: dir },
      ],
    });

    const created = await applyShotPlan(db, { proposalId, principal: "user:test" });
    expect(created).toHaveLength(2);

    const remaining = await listShots(db, projectId);
    const titles = remaining.map((s) => s.title);
    expect(titles).toContain("paid shot");     // protected: has a take
    expect(titles).toContain("new A");
    expect(titles).toContain("new B");
    expect(titles).not.toContain("old plain 1"); // replaced: no takes
    expect(titles).not.toContain("old plain 2");
    expect(remaining.map((s) => s.id)).not.toContain(plain1);
    expect(remaining.map((s) => s.id)).not.toContain(plain2);
  });
});
