import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "../src/schema";
import { reapStaleGenerations } from "../src/executor";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Reaper Org" });
  await db.insert(project).values({ id: projectId, organizationId: orgId, title: "Reaper", aspectRatio: "16:9", targetDurationS: "12" });
});

afterAll(async () => {
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

function row(status: "running" | "queued", startedAgoMin: number) {
  return {
    id: uuidv7(), organizationId: orgId, projectId, kind: "take" as const, target: {},
    modelId: "test-model-ref", promptSnapshot: { prompt: "p", templateVersion: 1, refAssetIds: [] },
    params: {}, status, commandId: uuidv7(), principal: "user:test",
    startedAt: new Date(Date.now() - startedAgoMin * 60_000),
  };
}

describe("REQ-GEN-022: stale running generations are reaped (orphan crash recovery)", () => {
  it("marks long-running rows failed with orphaned code; fresh running and queued untouched", async () => {
    const stale = row("running", 120);
    const fresh = row("running", 2);
    const queued = { ...row("queued", 0), startedAt: null };
    await db.insert(generation).values([stale, fresh, queued]);

    // Scoped to THIS fixture. Unscoped, it reaped rows other spec files had left behind — and its
    // own rows were reaped by theirs — so it failed three times for reasons unrelated to the code
    // under test. Production still reaps unscoped at claim time. (CLAUDE.md §6B.)
    const reaped = await reapStaleGenerations(db, projectId);
    expect(reaped).toBe(1);

    const [s] = await db.select().from(generation).where(eq(generation.id, stale.id));
    expect(s!.status).toBe("failed");
    expect(s!.errorCode).toBe("orphaned");
    const [f] = await db.select().from(generation).where(eq(generation.id, fresh.id));
    expect(f!.status).toBe("running");
    const [q] = await db.select().from(generation).where(eq(generation.id, queued.id));
    expect(q!.status).toBe("queued");
  });
});
