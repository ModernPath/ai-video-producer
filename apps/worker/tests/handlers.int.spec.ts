import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { createBoss, GEN_QUEUE } from "@avd/shared/queue";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { createShot, requestFrame } from "@avd/stb";
import { frameCandidate, shot } from "@avd/stb/schema";
import { handleGeneration } from "../src/handlers";
import { migrate } from "../../../scripts/migrate";

// REQ-GEN-016 — worker handler + queue round-trip (requires compose postgres).
describe("worker: gen-execute handler", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Worker Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Worker Slice", aspectRatio: "16:9", targetDurationS: "30",
    });
  });
  afterAll(async () => {
    const shotIds = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
    if (shotIds.length) {
      const { inArray } = await import("drizzle-orm");
      await db.delete(frameCandidate).where(inArray(frameCandidate.shotId, shotIds));
    }
    await db.delete(shot).where(eq(shot.projectId, projectId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("processes a specific generation and materializes the STB candidate", async () => {
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "worker shot", durationS: 6,
      direction: { synopsis: "s", subject: "x", action: "y" },
    });
    const genId = await requestFrame(db, { shotId, slot: "start", principal: "user:test", aspectRatio: "16:9" });

    await handleGeneration(db, { generationId: genId });

    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(g?.status).toBe("succeeded");
    const cands = await db.select().from(frameCandidate).where(eq(frameCandidate.shotId, shotId));
    expect(cands.length).toBe(1);
  });

  it("pg-boss round-trip: send then fetch returns the job payload", async () => {
    const boss = await createBoss();
    const jobId = await boss.send(GEN_QUEUE, { generationId: "test-id" });
    expect(jobId).toBeTruthy();
    const [job] = (await boss.fetch(GEN_QUEUE)) ?? [];
    expect((job?.data as { generationId?: string })?.generationId).toBe("test-id");
    await boss.complete(GEN_QUEUE, job!.id);
    await boss.stop({ close: true, graceful: false });
  }, 30_000);
});
