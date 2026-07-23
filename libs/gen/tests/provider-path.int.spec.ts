import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { getObject } from "@avd/ast/storage";
import { generation } from "../src/schema";
import { enqueueGeneration } from "../src/service";
import { runNextGeneration } from "../src/executor";
import { ProviderError, type GenProvider } from "../src/provider";
import { migrate } from "../../../scripts/migrate";

// REQ-GEN-010 + REQ-GEN-006 — provider port, stub-injected (no API key, no cost).
describe("GEN provider path (stub-injected)", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
  const stub: GenProvider = {
    name: "stub",
    billsCost: true,
    async generateText() {
      return { text: "stub text" };
    },
    async generateImage() {
      return { bytes: pngBytes, mime: "image/png" };
    },
    async generateVideo(r) {
      return { bytes: new Uint8Array(200_000).fill(7), mime: "video/mp4", durationS: r.durationSeconds };
    },
  };

  beforeAll(async () => {
    process.env.MOCK_GEN = "1"; // enqueue guard; injected provider must take precedence
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Provider Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Provider Slice", aspectRatio: "16:9", targetDurationS: "30",
    });
  });
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  function enqueue(kind: "frame" | "take") {
    return enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "user:test", kind,
      commandId: uuidv7(), target: { shotId: uuidv7() },
      promptInput: {
        aspectRatio: "16:9", durationSeconds: 6.5,
        entities: [], direction: { synopsis: "s", subject: "x", action: "y" },
      },
    });
  }

  it("REQ-GEN-010: stub frame bytes land in storage as ready asset with billed image cost", async () => {
    const id = await enqueue("frame");
    const res = await runNextGeneration(db, { organizationId: orgId, provider: stub });
    expect(res?.status).toBe("succeeded");
    const [g] = await db.select().from(generation).where(eq(generation.id, id));
    expect(Number(g!.costUsd)).toBeCloseTo(0.067, 5); // standard image price, billed
    const [a] = await db.select().from(asset).where(eq(asset.id, g!.outputAssetIds![0]!));
    expect(a?.mime).toBe("image/png");
    const obj = await getObject(a!.storageKey);
    expect(Buffer.from(obj.bytes).equals(Buffer.from(pngBytes))).toBe(true);
  });

  it("REQ-GEN-010: stub take bills duration x rate and records returned duration", async () => {
    const id = await enqueue("take");
    await runNextGeneration(db, { organizationId: orgId, provider: stub });
    const [g] = await db.select().from(generation).where(eq(generation.id, id));
    expect(Number(g!.costUsd)).toBeCloseTo(0.975, 5);
    const [a] = await db.select().from(asset).where(eq(asset.id, g!.outputAssetIds![0]!));
    expect(Number(a?.durationS)).toBeCloseTo(6.5, 1);
  });

  it("REQ-GEN-006: content-policy rejection is terminal failed, no asset, mapped code", async () => {
    const rejecting: GenProvider = {
      ...stub,
      async generateImage() {
        throw new ProviderError("content_policy", "safety block");
      },
    };
    const id = await enqueue("frame");
    const before = (await db.select().from(asset).where(eq(asset.organizationId, orgId))).length;
    const res = await runNextGeneration(db, { organizationId: orgId, provider: rejecting });
    expect(res?.status).toBe("failed");
    const [g] = await db.select().from(generation).where(eq(generation.id, id));
    expect(g?.status).toBe("failed");
    expect(g?.errorCode).toBe("content_policy");
    const after = (await db.select().from(asset).where(eq(asset.organizationId, orgId))).length;
    expect(after).toBe(before);
  });
});
