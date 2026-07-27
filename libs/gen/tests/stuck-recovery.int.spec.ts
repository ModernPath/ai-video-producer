import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { config } from "@avd/shared/config";
import { cancelGeneration, sweepStuckGenerations } from "../src/executor";
import { generation } from "../src/schema";

// USER 2026-07-27: "seems 2 (video) and 3 (image) are stuck and not completing, how to restart?"
//
// Two separate holes. (a) A QUEUED row is never reaped — I reasoned "it never started, so it cannot
// be orphaned", which is true in queue mode and FALSE inline: inline mode runs generations inside
// the request that created them, so nothing ever claims a queued row and it is dead on arrival.
// (b) There was no way to cancel anything. A run under the 30-minute window had no exit at all.
const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();
const originalMode = process.env.WORKER_MODE;

const insert = async (status: "running" | "queued", minutesAgo: number) => {
  const id = uuidv7();
  const at = new Date(Date.now() - minutesAgo * 60_000);
  await db.insert(generation).values({
    id, organizationId: orgId, projectId, kind: "take", target: {},
    modelId: "test-model", promptSnapshot: { prompt: "p", templateVersion: 1, refAssetIds: [] },
    params: {}, status, commandId: uuidv7(), principal: "user:test",
    createdAt: at, ...(status === "running" ? { startedAt: at } : {}),
  });
  return id;
};
const rowOf = async (id: string) => (await db.select().from(generation).where(eq(generation.id, id)))[0]!;

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Stuck Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Stuck", aspectRatio: "16:9", targetDurationS: "30",
  });
});
afterEach(async () => { await db.delete(generation).where(eq(generation.projectId, projectId)); });
afterAll(async () => {
  if (originalMode === undefined) delete process.env.WORKER_MODE; else process.env.WORKER_MODE = originalMode;
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-GEN-034: a queued row that nothing will claim is stuck, not waiting", () => {
  it("reaps a stale QUEUED row in inline mode — nothing consumes the queue there", async () => {
    delete process.env.WORKER_MODE; // inline
    const id = await insert("queued", config.gen.staleQueuedMinutes + 2);
    expect(await sweepStuckGenerations(db, projectId)).toBeGreaterThanOrEqual(1);
    const row = await rowOf(id);
    expect(row.status).toBe("failed");
    expect(row.errorCode).toBe("orphaned");
    expect(row.errorDetail).toMatch(/retry/i);
  });

  it("leaves a FRESH queued row alone — it may be about to run", async () => {
    delete process.env.WORKER_MODE;
    const id = await insert("queued", 0);
    await sweepStuckGenerations(db, projectId);
    expect((await rowOf(id)).status).toBe("queued");
  });

  it("NEVER reaps a queued row in queue mode, however old — pg-boss owns it", async () => {
    process.env.WORKER_MODE = "queue";
    const id = await insert("queued", config.gen.staleQueuedMinutes + 120);
    await sweepStuckGenerations(db, projectId);
    expect((await rowOf(id)).status).toBe("queued");
  });

  it("still reaps a stale RUNNING row in either mode", async () => {
    process.env.WORKER_MODE = "queue";
    const id = await insert("running", config.gen.staleRunningMinutes + 5);
    await sweepStuckGenerations(db, projectId);
    expect((await rowOf(id)).status).toBe("failed");
  });
});

describe("REQ-GEN-034: anything in flight can be cancelled", () => {
  it("cancels a running row, freeing its concurrency slot", async () => {
    const id = await insert("running", 2);
    expect(await cancelGeneration(db, { generationId: id })).toBe(true);
    const row = await rowOf(id);
    expect(row.status).toBe("failed");
    expect(row.errorCode).toBe("cancelled");
    expect(row.finishedAt).not.toBeNull();
  });

  it("cancels a queued row too", async () => {
    const id = await insert("queued", 1);
    expect(await cancelGeneration(db, { generationId: id })).toBe(true);
    expect((await rowOf(id)).status).toBe("failed");
  });

  it("says so rather than lying when there was nothing to cancel", async () => {
    const id = await insert("running", 1);
    await cancelGeneration(db, { generationId: id });
    expect(await cancelGeneration(db, { generationId: id })).toBe(false);
  });

  it("distinguishes cancelled from orphaned — one is a choice, the other a crash", async () => {
    const id = await insert("running", 1);
    await cancelGeneration(db, { generationId: id });
    expect((await rowOf(id)).errorDetail).toMatch(/cancell?ed/i);
    expect((await rowOf(id)).errorDetail).not.toMatch(/process running it likely died/i);
  });
});
