import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { asset } from "@avd/ast/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import { attachMusicTrack, getMusicBrief, materializeGenerationOutput, requestMusicBrief } from "../src/service";
import { musicBrief } from "../src/schema";
import { migrate } from "../../../scripts/migrate";

// REQ-STB-010 — Suno brief generation (mock provider).
describe("STB music brief", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Music Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Wake the City", aspectRatio: "16:9", targetDurationS: "28",
      brief: { idea: "energy drink teaser", tone: "electric" },
    });
  });
  afterAll(async () => {
    await db.delete(musicBrief).where(eq(musicBrief.projectId, projectId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("generates a brief mentioning the target duration; regenerate replaces", async () => {
    const gen1 = await requestMusicBrief(db, { projectId, principal: "user:test" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, gen1);
    const b1 = await getMusicBrief(db, projectId);
    expect(b1?.prompt).toContain("28");
    expect(b1?.generationId).toBe(gen1);

    const gen2 = await requestMusicBrief(db, { projectId, principal: "user:test" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, gen2);
    const rows = await db.select().from(musicBrief).where(eq(musicBrief.projectId, projectId));
    expect(rows.length).toBe(1); // replaced, not duplicated
    expect(rows[0]?.generationId).toBe(gen2);
  });

  it("attach: ready audio attaches; pending or non-audio rejected", async () => {
    const goodId = uuidv7();
    await db.insert(asset).values({
      id: goodId, organizationId: orgId, projectId, kind: "audio", source: "uploaded",
      status: "ready", storageKey: "test/track.mp3", mime: "audio/mpeg", bytes: 1000,
    });
    await attachMusicTrack(db, { projectId, assetId: goodId });
    const b = await getMusicBrief(db, projectId);
    expect(b?.activeTrackAssetId).toBe(goodId);

    const badId = uuidv7();
    await db.insert(asset).values({
      id: badId, organizationId: orgId, projectId, kind: "audio", source: "uploaded",
      status: "pending", storageKey: "test/x.mp3", mime: "audio/mpeg", bytes: 10,
    });
    await expect(attachMusicTrack(db, { projectId, assetId: badId })).rejects.toThrow(/ready audio/);
  });
});
