import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset, entity, projectEntity } from "@avd/ast/schema";
import { assetKey, putObject } from "@avd/ast/storage";
import { attachEntities, createEntity } from "@avd/ast";
import { generation } from "@avd/gen/schema";
import { runNextGeneration, type GenProvider, type ImageRequest } from "@avd/gen";
import { createShot, requestFrame, requestTake } from "../src/service";
import { frameCandidate, shot, take } from "../src/schema";
import { migrate } from "@avd/shared/migrate";

// REQ-AST-006 acceptance: attached cast flows into generation (text blocks + frame ref images).
describe("STB cast -> generation", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  const refBytes = new TextEncoder().encode("ref-image-bytes");
  let refAssetId: string;

  const capturedImages: ImageRequest[] = [];
  const capturing: GenProvider = {
    name: "capture",
    billsCost: false,
    async generateText() { return { text: "x" }; },
    async generateImage(r) { capturedImages.push(r); return { bytes: new Uint8Array([1]), mime: "image/png" }; },
    async generateVideo(r) { return { bytes: new Uint8Array(1000), mime: "video/mp4", durationS: r.durationSeconds }; },
    // REQ-GEN-019 arrived after these doubles were written; this path is not under test here.
    async generateMusic(): Promise<{ bytes: Uint8Array; mime: string }> {
      throw new Error("generateMusic not stubbed in this spec");
    },
  };

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Cast Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Cast Proj", aspectRatio: "16:9", targetDurationS: "30",
    });
    refAssetId = uuidv7();
    const key = assetKey(orgId, null, refAssetId, "png");
    await putObject(key, refBytes, "image/png");
    await db.insert(asset).values({
      id: refAssetId, organizationId: orgId, kind: "image", source: "uploaded",
      status: "ready", storageKey: key, mime: "image/png", bytes: refBytes.byteLength,
    });
    const entityId = await createEntity(db, {
      organizationId: orgId, kind: "product", name: "KAIJU Can",
      description: "green 330ml energy drink can", refAssetIds: [refAssetId],
    });
    await attachEntities(db, { projectId, entityIds: [entityId] });
  });
  afterAll(async () => {
    const shotIds = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
    if (shotIds.length) {
      await db.delete(take).where(inArray(take.shotId, shotIds));
      await db.delete(frameCandidate).where(inArray(frameCandidate.shotId, shotIds));
    }
    await db.delete(shot).where(eq(shot.projectId, projectId));
    await db.delete(projectEntity).where(eq(projectEntity.projectId, projectId));
    await db.delete(entity).where(eq(entity.organizationId, orgId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("frame: prompt has entity block; provider receives ref image bytes; provenance records refs", async () => {
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "can hero", durationS: 6,
      direction: { synopsis: "hero shot of the can", subject: "KAIJU Can", action: "slow spin" },
    });
    const genId = await requestFrame(db, { shotId, slot: "start", principal: "user:test", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId, provider: capturing });
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    const snap = g!.promptSnapshot as { prompt: string; refAssetIds?: string[] };
    expect(snap.prompt).toContain("Featuring KAIJU Can, green 330ml energy drink can"); // prose v2
    expect(snap.refAssetIds).toContain(refAssetId);
    expect(capturedImages.length).toBe(1);
    expect(capturedImages[0]!.refImages?.length).toBe(1);
    expect(Buffer.from(capturedImages[0]!.refImages![0]!.bytes).equals(Buffer.from(refBytes))).toBe(true);
  });

  it("take: prompt carries the same entity block", async () => {
    const [s] = await db.select().from(shot).where(eq(shot.projectId, projectId));
    const genId = await requestTake(db, { shotId: s!.id, principal: "user:test", aspectRatio: "16:9" });
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    expect((g!.promptSnapshot as { prompt: string }).prompt).toContain("Featuring KAIJU Can"); // prose v2
  });
});
