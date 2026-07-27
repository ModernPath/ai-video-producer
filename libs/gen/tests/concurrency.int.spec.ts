import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "../src/schema";
import { enqueueGeneration } from "../src/service";
import { runGenerationById, runNextGeneration } from "../src/executor";
import { resolveModel } from "../src/routing";
import { migrate } from "@avd/shared/migrate";

// Requires docker-compose postgres. MOCK_GEN path. BR-GEN-005 per-org video concurrency cap.
describe("REQ-GEN-011: per-org video concurrency cap (BR-GEN-005)", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  const runningIds: string[] = [];
  let queuedTakeId: string;

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "GEN Concurrency Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "GEN Concurrency",
      aspectRatio: "16:9", targetDurationS: "30",
    });
    // Seed the org at the cap: maxConcurrentVideoPerOrg fake running takes.
    for (let i = 0; i < config.gen.maxConcurrentVideoPerOrg; i++) {
      const id = uuidv7();
      runningIds.push(id);
      await db.insert(generation).values({
        id,
        organizationId: orgId,
        projectId,
        kind: "take",
        target: { shotId: uuidv7() },
        modelId: resolveModel("take"),
        promptSnapshot: { prompt: "seeded running take", templateVersion: 0, refAssetIds: [] },
        params: { durationSeconds: 6 },
        status: "running",
        startedAt: new Date(),
        commandId: uuidv7(),
        principal: "user:test",
      });
    }
  });
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  const promptInput = (durationSeconds: number) => ({
    aspectRatio: "16:9" as const,
    durationSeconds,
    entities: [],
    direction: { synopsis: "capped org", subject: "x", action: "y" },
  });

  it("leaves a queued take queued when the org is at the video cap (runNextGeneration → null)", async () => {
    queuedTakeId = await enqueueGeneration(db, {
      organizationId: orgId,
      projectId,
      principal: "user:test",
      kind: "take",
      commandId: uuidv7(),
      target: { shotId: uuidv7() },
      promptInput: promptInput(6),
    });
    const result = await runNextGeneration(db, { organizationId: orgId });
    expect(result).toBeNull();
    const [row] = await db.select().from(generation).where(eq(generation.id, queuedTakeId));
    expect(row?.status).toBe("queued");
  });

  it("runGenerationById on a capped video job returns null and leaves it queued", async () => {
    const result = await runGenerationById(db, queuedTakeId);
    expect(result).toBeNull();
    const [row] = await db.select().from(generation).where(eq(generation.id, queuedTakeId));
    expect(row?.status).toBe("queued");
  });

  it("claims a queued frame for the capped org (non-video kinds never blocked)", async () => {
    const frameId = await enqueueGeneration(db, {
      organizationId: orgId,
      projectId,
      principal: "user:test",
      kind: "frame",
      commandId: uuidv7(),
      target: { shotId: uuidv7() },
      promptInput: promptInput(0),
    });
    const result = await runNextGeneration(db, { organizationId: orgId });
    expect(result?.generationId).toBe(frameId);
    expect(result?.status).toBe("succeeded");
    // The older queued take is still untouched.
    const [takeRow] = await db.select().from(generation).where(eq(generation.id, queuedTakeId));
    expect(takeRow?.status).toBe("queued");
  });

  it("claims the queued take FIFO once a running slot frees", async () => {
    await db
      .update(generation)
      .set({ status: "succeeded", finishedAt: new Date() })
      .where(eq(generation.id, runningIds[0]!));
    const result = await runNextGeneration(db, { organizationId: orgId });
    expect(result?.generationId).toBe(queuedTakeId);
    expect(result?.status).toBe("succeeded");
    // Running video count is back at the cap: cap-1 seeded + the claimed take.
    const running = await db
      .select()
      .from(generation)
      .where(and(eq(generation.organizationId, orgId), eq(generation.status, "running")));
    expect(running.length).toBe(config.gen.maxConcurrentVideoPerOrg - 1);
  });
});
