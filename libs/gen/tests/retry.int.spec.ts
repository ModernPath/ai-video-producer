import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "../src/schema";
import { enqueueGeneration } from "../src/service";
import { retryGeneration } from "../src/retry";
import { runNextGeneration } from "../src/executor";
import { ProviderError, type GenProvider } from "../src/provider";
import { migrate } from "@avd/shared/migrate";

// REQ-GEN-005 / INV-GEN-005 — terminal-failure retry with provenance.
describe("GEN retry", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  const failing: GenProvider = {
    name: "failing", billsCost: false,
    async generateText() { return { text: "x" }; },
    async generateImage() { throw new ProviderError("provider_unavailable", "boom"); },
    async generateVideo() { throw new ProviderError("provider_unavailable", "boom"); },
    // REQ-GEN-019 arrived after these doubles were written; this path is not under test here.
    async generateMusic(): Promise<{ bytes: Uint8Array; mime: string }> {
      throw new Error("generateMusic not stubbed in this spec");
    },
  };

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Retry Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Retry Proj", aspectRatio: "16:9", targetDurationS: "20",
    });
  });
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("retry of a failed generation creates a new queued row with retry_of; source untouched; retried work succeeds", async () => {
    const genId = await enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "u", kind: "frame",
      commandId: uuidv7(), target: { shotId: uuidv7() },
      promptInput: { aspectRatio: "16:9", durationSeconds: 6, entities: [], direction: { synopsis: "s", subject: "x", action: "a" } },
    });
    await runNextGeneration(db, { organizationId: orgId, provider: failing });
    const [failed] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(failed?.status).toBe("failed");

    const retryId = await retryGeneration(db, { generationId: genId, principal: "u:retry" });
    const [retry] = await db.select().from(generation).where(eq(generation.id, retryId));
    expect(retry?.status).toBe("queued");
    expect(retry?.retryOf).toBe(genId);
    expect(JSON.stringify(retry?.promptSnapshot)).toBe(JSON.stringify(failed?.promptSnapshot));
    const [sourceAfter] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(sourceAfter?.status).toBe("failed"); // never mutated

    await runNextGeneration(db, { organizationId: orgId }); // mock provider now
    const [done] = await db.select().from(generation).where(eq(generation.id, retryId));
    expect(done?.status).toBe("succeeded");
  });

  it("retrying a non-failed generation is rejected", async () => {
    const [succeeded] = await db.select().from(generation).where(eq(generation.status, "succeeded"));
    await expect(retryGeneration(db, { generationId: succeeded!.id, principal: "u" })).rejects.toThrow(/conflict|failed/i);
  });
});
