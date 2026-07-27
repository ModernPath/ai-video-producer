import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { configForTest } from "@avd/shared/config/testing";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { enqueueGeneration } from "../src/service";
import { generation } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();
const originalCap = config.gen.quota.dailyUsdPerOrg;

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "Quota Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Quota", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  configForTest.gen.quota.dailyUsdPerOrg = originalCap;
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

const textInput = { projectTitle: "Quota", brief: { idea: "quota test" }, targetDurationSeconds: 12, entities: [] };

describe("REQ-GEN-004: per-org daily spend cap at enqueue (INV-GEN-004)", () => {
  it("under the cap: enqueues queued as normal", async () => {
    configForTest.gen.quota.dailyUsdPerOrg = 5;
    const id = await enqueueGeneration(db, {
      organizationId: orgId, projectId, kind: "script", principal: "user:test", commandId: uuidv7(), target: {}, textInput,
    });
    const [row] = await db.select().from(generation).where(eq(generation.id, id));
    expect(row!.status).toBe("queued");
  });

  it("at/over the cap: inserts a failed row with quota_exceeded and never reaches a provider", async () => {
    // seed today's spend beyond a tiny cap
    await db.insert(generation).values({
      id: uuidv7(), organizationId: orgId, projectId, kind: "take", target: {},
      modelId: "test-model-ref", promptSnapshot: { prompt: "p", templateVersion: 1, refAssetIds: [] },
      params: {}, status: "succeeded", costUsd: "0.90", commandId: uuidv7(), principal: "user:test",
    });
    configForTest.gen.quota.dailyUsdPerOrg = 0.5;
    const id = await enqueueGeneration(db, {
      organizationId: orgId, projectId, kind: "script", principal: "user:test", commandId: uuidv7(), target: {}, textInput,
    });
    const [row] = await db.select().from(generation).where(eq(generation.id, id));
    expect(row!.status).toBe("failed");
    expect(row!.errorCode).toBe("quota_exceeded");
    expect(row!.costUsd).toBeNull();
  });
});
