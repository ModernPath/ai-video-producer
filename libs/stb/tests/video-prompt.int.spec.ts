import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset, entity, projectEntity } from "@avd/ast/schema";
import { attachEntities, createEntity } from "@avd/ast";
import { generation } from "@avd/gen/schema";
import { draftScript, proposeShotPlan, requestMusicBrief } from "../src/service";
import { scriptVersion } from "../src/schema";
import { migrate } from "@avd/shared/migrate";

// REQ-STB-012 — the video prompt + cast reach the script model's context.
describe("STB video prompt -> script/plan prompts with cast", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "VP Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "VP Proj", aspectRatio: "16:9", targetDurationS: "20",
      brief: { idea: "sunrise product launch for a bold energy drink" },
    });
    const refId = uuidv7();
    await db.insert(asset).values({
      id: refId, organizationId: orgId, kind: "image", source: "uploaded",
      status: "ready", storageKey: "t/r.png", mime: "image/png", bytes: 5,
    });
    const eid = await createEntity(db, {
      organizationId: orgId, kind: "product", name: "KAIJU Can",
      description: "green 330ml can, claw logo", refAssetIds: [refId],
    });
    await attachEntities(db, { projectId, entityIds: [eid] });
  });
  afterAll(async () => {
    await db.delete(scriptVersion).where(eq(scriptVersion.projectId, projectId));
    await db.delete(projectEntity).where(eq(projectEntity.projectId, projectId));
    await db.delete(entity).where(eq(entity.organizationId, orgId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("script + plan + music prompts contain the video prompt and CAST blocks", async () => {
    for (const request of [draftScript, proposeShotPlan, requestMusicBrief]) {
      let genId: string;
      if (request === proposeShotPlan) {
        // plan needs a script first
        const g = await draftScript(db, { projectId, principal: "u" });
        await db.update(generation).set({ status: "succeeded", output: { text: "stub script" } }).where(eq(generation.id, g));
        const { materializeGenerationOutput } = await import("../src/service");
        await materializeGenerationOutput(db, g);
        genId = await proposeShotPlan(db, { projectId, principal: "u" });
      } else {
        genId = await request(db, { projectId, principal: "u" });
      }
      const [g] = await db.select().from(generation).where(eq(generation.id, genId));
      const prompt = (g!.promptSnapshot as { prompt: string }).prompt;
      expect(prompt).toContain("sunrise product launch");
      if (request === requestMusicBrief) {
        // QA 2026-07-23: music briefs are SONG prompts — mood comes from the brief/script, not cast blocks
        expect(prompt).not.toContain("CAST:");
      } else {
        expect(prompt).toContain("CAST: [product] KAIJU Can — green 330ml can, claw logo");
      }
    }
  });
});
