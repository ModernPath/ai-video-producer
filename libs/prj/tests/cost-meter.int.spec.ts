import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { generation } from "@avd/gen/schema";
import { project } from "../src/schema";
import { costMeterUsd, createProject } from "../src/service";
import { migrate } from "../../../scripts/migrate";

// REQ-PRJ-004 / INV-PRJ-004 — cost meter = sum of succeeded+running generation costs for the project.
describe("REQ-PRJ-004: cost meter read model", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  let projectId: string;
  let emptyProjectId: string;

  const genRow = (status: "queued" | "running" | "succeeded" | "failed" | "canceled", costUsd: string | null) => ({
    id: uuidv7(),
    organizationId: orgId,
    projectId,
    kind: "script" as const,
    target: {},
    modelId: "test-model-ref", // opaque test placeholder, not a provider model id
    promptSnapshot: { prompt: "p", templateVersion: 1, refAssetIds: [] },
    params: {},
    status,
    ...(costUsd === null ? {} : { costUsd }),
    commandId: uuidv7(),
    principal: "user:test",
  });

  beforeAll(async () => {
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "PRJ Cost Org" });
    projectId = await createProject(db, {
      organizationId: orgId, title: "Cost Meter", aspectRatio: "16:9", commandId: uuidv7(),
    });
    emptyProjectId = await createProject(db, {
      organizationId: orgId, title: "No Spend", aspectRatio: "9:16", commandId: uuidv7(),
    });
  });
  afterAll(async () => {
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("INV-PRJ-004: sums succeeded + running costs; excludes queued/failed/canceled", async () => {
    await db.insert(generation).values([
      genRow("succeeded", "0.1250"),
      genRow("succeeded", "1.0000"),
      genRow("running", "0.5000"),
      genRow("failed", "9.9900"),   // excluded
      genRow("canceled", "3.0000"), // excluded
      genRow("queued", null),       // excluded (no cost yet)
    ]);
    expect(await costMeterUsd(db, projectId)).toBeCloseTo(1.625, 4);
  });

  it("returns 0 for a project with no generations", async () => {
    expect(await costMeterUsd(db, emptyProjectId)).toBe(0);
  });
});
