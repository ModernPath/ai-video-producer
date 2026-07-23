import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { assetKey, getObject, putObject } from "@avd/ast/storage";
import { generation } from "../src/schema";
import { enqueueGeneration } from "../src/service";
import { runNextGeneration } from "../src/executor";
import type { GenProvider, ImageRequest } from "../src/provider";
import { migrate } from "../../../scripts/migrate";

// REQ-GEN-012 — AI image editing with provenance lineage.
describe("GEN image_edit", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  const sourceId = uuidv7();
  const sourceBytes = new TextEncoder().encode("original-image-bytes");

  const captured: ImageRequest[] = [];
  const capturing: GenProvider = {
    name: "capture",
    billsCost: true,
    async generateText() { return { text: "x" }; },
    async generateImage(r) { captured.push(r); return { bytes: new Uint8Array([7, 7, 7]), mime: "image/png" }; },
    async generateVideo(r) { return { bytes: new Uint8Array(10), mime: "video/mp4", durationS: r.durationSeconds }; },
  };

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Edit Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Edit Proj", aspectRatio: "16:9", targetDurationS: "30",
    });
    const key = assetKey(orgId, projectId, sourceId, "png");
    await putObject(key, sourceBytes, "image/png");
    await db.insert(asset).values({
      id: sourceId, organizationId: orgId, projectId, kind: "image", source: "uploaded",
      status: "ready", storageKey: key, mime: "image/png", bytes: sourceBytes.byteLength,
    });
  });
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("instruction + source bytes reach the provider; output is a new asset with edit_of lineage", async () => {
    const genId = await enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "user:test", kind: "image_edit",
      commandId: uuidv7(), target: { assetId: sourceId },
      refs: { editSourceAssetId: sourceId },
      editInput: { instruction: "change the jacket to red", aspectRatio: "16:9" },
    });
    await runNextGeneration(db, { organizationId: orgId, provider: capturing });

    expect(captured.length).toBe(1);
    expect(captured[0]!.prompt).toContain("change the jacket to red");
    expect(Buffer.from(captured[0]!.refImages![0]!.bytes).equals(Buffer.from(sourceBytes))).toBe(true);

    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(g?.status).toBe("succeeded");
    const [edited] = await db.select().from(asset).where(eq(asset.id, g!.outputAssetIds![0]!));
    expect(edited?.editOf).toBe(sourceId); // lineage (INV-AST-001)
    // source untouched
    const [src] = await db.select().from(asset).where(eq(asset.id, sourceId));
    expect(src?.bytes).toBe(sourceBytes.byteLength);
    const obj = await getObject(src!.storageKey);
    expect(Buffer.from(obj.bytes).equals(Buffer.from(sourceBytes))).toBe(true);
  });
});
