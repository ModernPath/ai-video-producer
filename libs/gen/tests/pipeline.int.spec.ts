import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "../src/schema";
import { enqueueGeneration } from "../src/service";
import { runNextGeneration } from "../src/executor";
import { migrate } from "@avd/shared/migrate";

// Requires docker-compose postgres. MOCK_GEN path (REQ-GEN-015).
describe("GEN pipeline: enqueue -> execute (mock) -> asset", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "GEN Test Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "GEN Slice",
      aspectRatio: "16:9", targetDurationS: "30",
    });
  });
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  const takeInput = () => ({
    organizationId: orgId,
    projectId,
    principal: "user:test",
    kind: "take" as const,
    commandId: uuidv7(),
    target: { shotId: uuidv7() },
    promptInput: {
      aspectRatio: "16:9" as const,
      durationSeconds: 6.5,
      entities: [],
      direction: { synopsis: "test", subject: "x", action: "y" },
    },
  });

  it("REQ-GEN-001: provenance row exists queued, before execution", async () => {
    const id = await enqueueGeneration(db, takeInput());
    const [row] = await db.select().from(generation).where(eq(generation.id, id));
    expect(row?.status).toBe("queued");
    expect(row?.modelId).toMatch(/veo|omni/);
    const snap = row?.promptSnapshot as { prompt: string; templateVersion: number };
    expect(snap.prompt).toContain("16:9"); // prose v2
    expect(snap.templateVersion).toBeGreaterThanOrEqual(1);
  });

  it("REQ-GEN-015 + 002 + 003: mock executor completes with new ready asset and zero cost", async () => {
    const result = await runNextGeneration(db, { organizationId: orgId });
    expect(result?.status).toBe("succeeded");
    const [row] = await db.select().from(generation).where(eq(generation.id, result!.generationId));
    expect(row?.costUsd).toBe("0.0000");
    expect(row?.outputAssetIds?.length).toBe(1);
    const [a] = await db.select().from(asset).where(eq(asset.id, row!.outputAssetIds![0]!));
    expect(a?.status).toBe("ready");
    expect(a?.generationId).toBe(row?.id);
    expect(a?.kind).toBe("video");
  });

  it("REQ-GEN-002: regeneration creates a second asset, first untouched", async () => {
    const firstAssets = await db.select().from(asset).where(eq(asset.organizationId, orgId));
    await enqueueGeneration(db, takeInput());
    await runNextGeneration(db, { organizationId: orgId });
    const after = await db.select().from(asset).where(eq(asset.organizationId, orgId));
    expect(after.length).toBe(firstAssets.length + 1);
    expect(after.map((a) => a.id)).toEqual(expect.arrayContaining(firstAssets.map((a) => a.id)));
  });
});
