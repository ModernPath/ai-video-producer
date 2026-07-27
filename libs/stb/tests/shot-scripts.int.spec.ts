import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset, entity, projectEntity } from "@avd/ast/schema";
import { attachEntities, createEntity } from "@avd/ast";
import { generation } from "@avd/gen/schema";
import { createShot, requestFrame, requestTake, updateShotScripts } from "../src/service";
import { frameCandidate, shot, take } from "../src/schema";
import { migrate } from "@avd/shared/migrate";

// REQ-STB-013 — USER: every clip has an editable image script and video script; refs still attach.
describe("STB per-shot scripts", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  let shotId: string;
  let refAssetId: string;

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Scripts Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Scripts Proj", aspectRatio: "16:9", targetDurationS: "20",
    });
    refAssetId = uuidv7();
    await db.insert(asset).values({
      id: refAssetId, organizationId: orgId, kind: "image", source: "uploaded",
      status: "ready", storageKey: "t/ref.png", mime: "image/png", bytes: 5,
    });
    const eid = await createEntity(db, {
      organizationId: orgId, kind: "product", name: "KAIJU Can", description: "green can", refAssetIds: [refAssetId],
    });
    await attachEntities(db, { projectId, entityIds: [eid] });
    shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "hero", durationS: 6,
      direction: { synopsis: "auto synopsis text", subject: "sub", action: "act" },
    });
  });
  afterAll(async () => {
    await db.delete(take).where(inArray(take.shotId, [shotId]));
    await db.delete(frameCandidate).where(inArray(frameCandidate.shotId, [shotId]));
    await db.delete(shot).where(eq(shot.projectId, projectId));
    await db.delete(projectEntity).where(eq(projectEntity.projectId, projectId));
    await db.delete(entity).where(eq(entity.organizationId, orgId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("custom image script is used verbatim; auto direction gone; entity refs still attach", async () => {
    await updateShotScripts(db, { shotId, imagePrompt: "MY EXACT IMAGE PROMPT: neon noir can on wet steel" });
    const genId = await requestFrame(db, { shotId, slot: "start", principal: "u", aspectRatio: "16:9" });
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    const snap = g!.promptSnapshot as { prompt: string; refAssetIds?: string[] };
    expect(snap.prompt).toContain("MY EXACT IMAGE PROMPT");
    expect(snap.prompt).not.toContain("auto synopsis text");
    expect(snap.refAssetIds).toContain(refAssetId); // refs still ride along
  });

  it("custom video script likewise; unset script keeps auto-composed behavior", async () => {
    await updateShotScripts(db, { shotId, videoPrompt: "MY EXACT VIDEO PROMPT: slow dolly, rain" });
    const genV = await requestTake(db, { shotId, principal: "u", aspectRatio: "16:9" });
    const [gv] = await db.select().from(generation).where(eq(generation.id, genV));
    expect((gv!.promptSnapshot as { prompt: string }).prompt).toContain("MY EXACT VIDEO PROMPT");

    await updateShotScripts(db, { shotId, imagePrompt: null, videoPrompt: null }); // clear -> auto
    const genAuto = await requestFrame(db, { shotId, slot: "start", principal: "u", aspectRatio: "16:9" });
    const [ga] = await db.select().from(generation).where(eq(generation.id, genAuto));
    expect((ga!.promptSnapshot as { prompt: string }).prompt).toContain("auto synopsis text");
  });
});
