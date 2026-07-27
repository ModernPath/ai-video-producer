// REQ-GEN-018 — race-safe claim: two concurrent runners must never both execute the same
// queued row (read-then-update without a guard double-billed in theory; queue mode makes
// multi-claimer real). Requires compose pg.
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "../src/schema";
import { resolveModel } from "../src/routing";
import { claimGeneration, runNextGeneration } from "../src/executor";
import type { GenProvider } from "../src/provider";
import { migrate } from "@avd/shared/migrate";

describe("REQ-GEN-018: race-safe claim across parallel runners", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Claim Race Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Claim Race", aspectRatio: "16:9", targetDurationS: "30",
    });
  });
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("claimGeneration: concurrent claims on one row -> exactly one winner (conditional update)", async () => {
    const genId = uuidv7();
    await db.insert(generation).values({
      id: genId, organizationId: orgId, projectId, kind: "script",
      target: {}, modelId: resolveModel("script"),
      promptSnapshot: { prompt: "claim me", templateVersion: 0, refAssetIds: [] },
      params: {}, status: "queued", commandId: uuidv7(), principal: "user:test",
    });
    const wins = await Promise.all(Array.from({ length: 4 }, () => claimGeneration(db, genId)));
    expect(wins.filter(Boolean)).toHaveLength(1); // deterministic: WHERE status='queued' guards the flip
    const again = await claimGeneration(db, genId);
    expect(again).toBe(false); // already running — a second claimer must never re-execute
    await db.delete(generation).where(eq(generation.id, genId));
  });

  it("N concurrent runners on one queued row -> exactly one provider execution", async () => {
    const genId = uuidv7();
    await db.insert(generation).values({
      id: genId, organizationId: orgId, projectId, kind: "script",
      target: {}, modelId: resolveModel("script"),
      promptSnapshot: { prompt: "race me", templateVersion: 0, refAssetIds: [] },
      params: {}, status: "queued", commandId: uuidv7(), principal: "user:test",
    });
    let executions = 0;
    const slow: GenProvider = {
      name: "race-stub", billsCost: false,
      async generateText() {
        executions += 1;
        await new Promise((r) => setTimeout(r, 150)); // hold the row in-flight so racers overlap
        return { text: "ok" };
      },
      generateImage: () => { throw new Error("unused"); },
      generateVideo: () => { throw new Error("unused"); },
      generateMusic: () => { throw new Error("unused"); },
    };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => runNextGeneration(db, { organizationId: orgId, provider: slow }))
    );
    expect(executions).toBe(1); // the row ran ONCE — losers observed the claim and moved on
    expect(results.filter(Boolean)).toHaveLength(1);
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(g!.status).toBe("succeeded");
  });
});
