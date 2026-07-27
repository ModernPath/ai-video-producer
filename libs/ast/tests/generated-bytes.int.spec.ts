import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { enqueueGeneration, runNextGeneration } from "@avd/gen";
import { generation } from "@avd/gen/schema";
import { asset } from "../src/schema";
import { getObject } from "../src/storage";
import { migrate } from "@avd/shared/migrate";

// REQ-AST-002 — mock generations must store real media bytes (no fixture:// keys).
describe("REQ-AST-002: generated assets carry real bytes", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "AST Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "AST Slice", aspectRatio: "16:9", targetDurationS: "30",
    });
  });
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  async function generate(kind: "frame" | "take") {
    await enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "user:test", kind,
      commandId: uuidv7(), target: { shotId: uuidv7() },
      promptInput: {
        aspectRatio: "16:9", durationSeconds: 6,
        entities: [], direction: { synopsis: "dawn harbor", subject: "s", action: "a" },
      },
    });
    const r = await runNextGeneration(db, { organizationId: orgId });
    const [g] = await db.select().from(generation).where(eq(generation.id, r!.generationId));
    const [a] = await db.select().from(asset).where(eq(asset.id, g!.outputAssetIds![0]!));
    return a!;
  }

  it("frame: stores an SVG image with real bytes", async () => {
    const a = await generate("frame");
    expect(a.storageKey).not.toContain("fixture://");
    expect(a.mime).toBe("image/svg+xml");
    expect(a.bytes).toBeGreaterThan(100);
    const obj = await getObject(a.storageKey);
    expect(obj.bytes.byteLength).toBe(a.bytes);
  });

  it("take: stores a playable MP4 with real bytes", async () => {
    const a = await generate("take");
    expect(a.mime).toBe("video/mp4");
    const obj = await getObject(a.storageKey);
    expect(obj.bytes.byteLength).toBeGreaterThan(100_000);
    // MP4 signature: 'ftyp' at offset 4
    expect(Buffer.from(obj.bytes.slice(4, 8)).toString("ascii")).toBe("ftyp");
  });
});
