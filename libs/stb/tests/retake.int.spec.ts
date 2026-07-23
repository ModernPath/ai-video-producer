import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { runGenerationById } from "@avd/gen";
import {
  createShot, materializeGenerationOutput, requestFrame, requestRetake, requestTake, selectFrame,
} from "../src/service";
import { frameCandidate, shot, take } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "Retake Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Retake", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  const ids = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
  for (const sid of ids) {
    await db.delete(take).where(eq(take.shotId, sid));
    await db.delete(frameCandidate).where(eq(frameCandidate.shotId, sid));
  }
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-STB-020: retake with instruction (SCN-STB-021)", () => {
  it("retake enqueues with the instruction in the prompt, the source take's conditioning frame, and materializes with retake_of lineage", async () => {
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "s",
      direction: { synopsis: "a", subject: "b", action: "c" }, durationS: 4,
    });
    const gf = await requestFrame(db, { shotId, slot: "start", principal: "u", aspectRatio: "16:9" });
    await runGenerationById(db, gf);
    const mf = (await materializeGenerationOutput(db, gf)) as { id: string };
    await selectFrame(db, { shotId, frameCandidateId: mf.id });

    const gt = await requestTake(db, { shotId, principal: "u", aspectRatio: "16:9" });
    await runGenerationById(db, gt);
    const mt = (await materializeGenerationOutput(db, gt)) as { id: string };
    const originalTakeId = mt.id;

    const gr = await requestRetake(db, { takeId: originalTakeId, instruction: "slower camera, hold the smile", principal: "u", aspectRatio: "16:9" });
    const [g] = await db.select().from(generation).where(eq(generation.id, gr));
    expect(g!.kind).toBe("retake");
    const snap = g!.promptSnapshot as { prompt: string; refs?: { startFrameAssetId?: string } };
    expect(snap.prompt).toContain("slower camera, hold the smile");
    // conditioned on the ORIGINAL take's frame, not whatever is currently selected
    const [orig] = await db.select().from(take).where(eq(take.id, originalTakeId));
    const [origGen] = await db.select().from(generation).where(eq(generation.id, orig!.generationId));
    const origFrame = (origGen!.promptSnapshot as { refs?: { startFrameAssetId?: string } }).refs?.startFrameAssetId;
    expect(snap.refs?.startFrameAssetId).toBe(origFrame);

    await runGenerationById(db, gr);
    const mr = (await materializeGenerationOutput(db, gr)) as { id: string };
    const [newTake] = await db.select().from(take).where(eq(take.id, mr.id));
    expect(newTake!.retakeOf).toBe(originalTakeId); // lineage
    expect(newTake!.shotId).toBe(shotId);           // INV-STB-005: same shot
  });
});
