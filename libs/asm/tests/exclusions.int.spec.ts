import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import { createShot, materializeGenerationOutput, requestTake, selectTake } from "@avd/stb";
import { frameCandidate, shot, take } from "@avd/stb/schema";
import { AsmValidationError, createSnapshot } from "../src/service";
import { exportJob, storyboardSnapshot } from "../src/schema";
import { migrate } from "@avd/shared/migrate";

// REQ-ASM-008 — exclusions are explicit, recorded, and the only path around INV-ASM-002.
describe("ASM snapshot exclusions", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  let readyShotId: string;
  let bareShotId: string;

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Excl Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Excl Proj", aspectRatio: "16:9", targetDurationS: "12",
    });
    readyShotId = await createShot(db, {
      organizationId: orgId, projectId, title: "ready one", durationS: 6,
      direction: { synopsis: "s", subject: "x", action: "a" },
    });
    const g = await requestTake(db, { shotId: readyShotId, principal: "u", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    const m = await materializeGenerationOutput(db, g);
    await selectTake(db, { shotId: readyShotId, takeId: m!.id });
    bareShotId = await createShot(db, {
      organizationId: orgId, projectId, title: "bare shot", durationS: 5,
      direction: { synopsis: "s", subject: "x", action: "a" },
    });
  }, 60_000);

  afterAll(async () => {
    await db.delete(exportJob).where(eq(exportJob.projectId, projectId));
    await db.delete(storyboardSnapshot).where(eq(storyboardSnapshot.projectId, projectId));
    const shotIds = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
    if (shotIds.length) {
      await db.delete(take).where(inArray(take.shotId, shotIds));
      await db.delete(frameCandidate).where(inArray(frameCandidate.shotId, shotIds));
    }
    await db.delete(shot).where(eq(shot.projectId, projectId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("unlisted takeless shot still rejects by name (no silent drops)", async () => {
    await expect(createSnapshot(db, { projectId, principal: "u" })).rejects.toThrow(/bare shot/);
    await expect(createSnapshot(db, { projectId, principal: "u", excludeShotIds: [uuidv7()] }))
      .rejects.toThrow(AsmValidationError);
  });

  it("explicit exclusion snapshots the ready subset and records provenance", async () => {
    const snapId = await createSnapshot(db, { projectId, principal: "u", excludeShotIds: [bareShotId] });
    const [snap] = await db.select().from(storyboardSnapshot).where(eq(storyboardSnapshot.id, snapId));
    const items = snap!.items as Array<{ shotId: string }>;
    expect(items.map((i) => i.shotId)).toEqual([readyShotId]);
    const excluded = snap!.excluded as Array<{ shotId: string; title: string }>;
    expect(excluded).toEqual([{ shotId: bareShotId, title: "bare shot" }]);
  });
});
