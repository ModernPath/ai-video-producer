import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { runGenerationById } from "@avd/gen";
import {
  createShot, listCandidates, materializeGenerationOutput, requestFrame, requestTake, selectFrame, selectTake, takeProvenance,
} from "../src/service";
import { frameCandidate, shot, take } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "Reselect Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Reselect", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  const shotIds = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
  for (const sid of shotIds) {
    await db.delete(take).where(eq(take.shotId, sid));
    await db.delete(frameCandidate).where(eq(frameCandidate.shotId, sid));
  }
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

async function makeFrame(shotId: string) {
  const g = await requestFrame(db, { shotId, slot: "start", principal: "u", aspectRatio: "16:9" });
  await runGenerationById(db, g);
  const m = (await materializeGenerationOutput(db, g)) as { kind: "frame"; id: string };
  return m.id;
}

describe("REQ-STB-006: frame re-selection keeps takes + provenance (INV-STB-006)", () => {
  it("re-selecting a different frame preserves existing takes and their conditioning frame is queryable", async () => {
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "s",
      direction: { synopsis: "a", subject: "b", action: "c" }, durationS: 4,
    });
    const frameA = await makeFrame(shotId);
    await selectFrame(db, { shotId, frameCandidateId: frameA });

    const gTake = await requestTake(db, { shotId, principal: "u", aspectRatio: "16:9" });
    await runGenerationById(db, gTake);
    const mt = (await materializeGenerationOutput(db, gTake)) as { kind: "take"; id: string };
    const takeId = mt.id;
    await selectTake(db, { shotId, takeId });

    const frameB = await makeFrame(shotId);
    await selectFrame(db, { shotId, frameCandidateId: frameB });

    // take survives re-selection
    const cands = await listCandidates(db, shotId);
    expect(cands.takes.map((t) => t.id)).toContain(takeId);

    // provenance: the take still knows it was conditioned on frame A, not the new selection
    const prov = await takeProvenance(db, takeId);
    const candsAfter = await listCandidates(db, shotId);
    const frameAAsset = candsAfter.frames.find((f) => f.id === frameA)!.imageAssetId;
    expect(prov.startFrameAssetId).toBe(frameAAsset);

    const [s] = await db.select().from(shot).where(eq(shot.id, shotId));
    expect(s!.selectedStartFrameId).toBe(frameB);
    expect(s!.selectedTakeId).toBe(takeId); // selection of take untouched by frame re-selection
  });
});
