import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { assetKey, putObject } from "@avd/ast/storage";
import { generation } from "../src/schema";
import { enqueueGeneration } from "../src/service";
import { runNextGeneration } from "../src/executor";
import type { GenProvider, VideoRequest } from "../src/provider";
import { migrate } from "../../../scripts/migrate";

// REQ-GEN-009 — selected start frame flows to the provider as image conditioning.
describe("GEN frame-conditioned takes", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  const frameAssetId = uuidv7();
  const frameBytes = new TextEncoder().encode("<svg>start-frame</svg>");

  const captured: VideoRequest[] = [];
  const capturing: GenProvider = {
    name: "capture",
    billsCost: false,
    async generateText() { return { text: "x" }; },
    async generateImage() { return { bytes: new Uint8Array([1]), mime: "image/png" }; },
    async generateVideo(r) {
      captured.push(r);
      return { bytes: new Uint8Array(200_000).fill(3), mime: "video/mp4", durationS: r.durationSeconds };
    },
  };

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "FrameCond Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "FrameCond", aspectRatio: "16:9", targetDurationS: "30",
    });
    const key = assetKey(orgId, projectId, frameAssetId, "svg");
    await putObject(key, frameBytes, "image/svg+xml");
    await db.insert(asset).values({
      id: frameAssetId, organizationId: orgId, projectId, kind: "image", source: "generated",
      status: "ready", storageKey: key, mime: "image/svg+xml", bytes: frameBytes.byteLength,
    });
  });
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  function enqueueTake(withFrame: boolean) {
    return enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "user:test", kind: "take",
      commandId: uuidv7(), target: { shotId: uuidv7() },
      refs: withFrame ? { startFrameAssetId: frameAssetId } : undefined,
      promptInput: {
        aspectRatio: "16:9", durationSeconds: 6, entities: [],
        direction: { synopsis: "s", subject: "x", action: "y" },
      },
    });
  }

  it("passes selected start frame bytes to the provider and records the ref", async () => {
    const genId = await enqueueTake(true);
    await runNextGeneration(db, { organizationId: orgId, provider: capturing });
    expect(captured.length).toBe(1);
    expect(captured[0]!.startFrame?.mime).toBe("image/svg+xml");
    expect(Buffer.from(captured[0]!.startFrame!.bytes).equals(Buffer.from(frameBytes))).toBe(true);
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    const snap = g!.promptSnapshot as { refAssetIds?: string[] };
    expect(snap.refAssetIds).toContain(frameAssetId);
  });

  it("without a selected frame the provider gets no startFrame", async () => {
    await enqueueTake(false);
    await runNextGeneration(db, { organizationId: orgId, provider: capturing });
    expect(captured.length).toBe(2);
    expect(captured[1]!.startFrame).toBeUndefined();
  });
});
