import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { runGenerationById } from "@avd/gen";
import {
  createShot, materializeGenerationOutput, requestAnimationOverlay, requestFrame, requestTake, selectFrame,
} from "../src/service";
import { frameCandidate, shot, take } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "Overlay Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Overlay", aspectRatio: "16:9", targetDurationS: "12",
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

describe("REQ-ANM-002: overlay on an existing take", () => {
  it("enqueues animation with the source asset ref; result is a new take lineage-linked to the source", async () => {
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

    const go = await requestAnimationOverlay(db, { takeId: mt.id, text: "Pasi — Founder", principal: "u", aspectRatio: "16:9" });
    const [g] = await db.select().from(generation).where(eq(generation.id, go));
    expect(g!.kind).toBe("animation");
    const snap = g!.promptSnapshot as { refs?: { editSourceAssetId?: string }; input?: { template?: string } };
    const [srcTake] = await db.select().from(take).where(eq(take.id, mt.id));
    expect(snap.refs?.editSourceAssetId).toBe(srcTake!.videoAssetId);
    expect(snap.input?.template).toBe("lower-third");

    await runGenerationById(db, go);
    const mo = (await materializeGenerationOutput(db, go)) as { id: string };
    const [overlayTake] = await db.select().from(take).where(eq(take.id, mo.id));
    expect(overlayTake!.retakeOf).toBe(mt.id);
    expect(overlayTake!.shotId).toBe(shotId);
  });
});
