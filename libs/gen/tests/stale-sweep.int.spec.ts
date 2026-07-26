import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { config } from "@avd/shared/config";
import { sweepStuckGenerations } from "../src/executor";
import { generation } from "../src/schema";

// USER 2026-07-26: "two videos seem stuck". Two takes sat `running` for 38 minutes — past the
// 30-minute stale window — with the UI spinning "generating video…" forever.
//
// REQ-GEN-022 already reaps orphans, but only inside `runNextGeneration`, i.e. when the user
// DISPATCHES NEW WORK. Someone staring at a stuck shot and waiting is precisely the person who
// never triggers the recovery. This is that sweep as something a page load can call.
const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

const insertRun = async (minutesAgo: number, status: "running" | "queued") => {
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

const statusOf = async (id: string) =>
  (await db.select().from(generation).where(eq(generation.id, id)))[0]!;

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Sweep Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Sweep", aspectRatio: "16:9", targetDurationS: "30",
  });
});

afterAll(async () => {
  await db.delete(generation).where(eq(generation.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-GEN-027: stuck runs recover without the user dispatching new work", () => {
  it("fails a run stuck past the stale window, with a retryable reason", async () => {
    const id = await insertRun(config.gen.staleRunningMinutes + 8, "running");
    expect(await sweepStuckGenerations(db)).toBeGreaterThanOrEqual(1);
    const row = await statusOf(id);
    expect(row.status).toBe("failed");
    expect(row.errorCode).toBe("orphaned");
    expect(row.errorDetail).toMatch(/retry/i);
    expect(row.finishedAt).not.toBeNull();
  });

  it("leaves a run that is still legitimately in flight alone", async () => {
    const id = await insertRun(2, "running");
    await sweepStuckGenerations(db);
    expect((await statusOf(id)).status).toBe("running");
  });

  it("leaves queued work alone — it has not started, so it cannot be orphaned", async () => {
    const id = await insertRun(config.gen.staleRunningMinutes + 8, "queued");
    await sweepStuckGenerations(db);
    expect((await statusOf(id)).status).toBe("queued");
  });

  it("is safe to call on every page load — a second sweep changes nothing", async () => {
    await sweepStuckGenerations(db);
    expect(await sweepStuckGenerations(db)).toBe(0);
  });

  it("frees the video concurrency slot the stuck run was holding (BR-GEN-005)", async () => {
    const stuck = await Promise.all(
      Array.from({ length: config.gen.maxConcurrentVideoPerOrg }, () =>
        insertRun(config.gen.staleRunningMinutes + 8, "running"))
    );
    await sweepStuckGenerations(db);
    for (const id of stuck) expect((await statusOf(id)).status).toBe("failed");
  });
});
