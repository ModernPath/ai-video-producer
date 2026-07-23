import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { modelRoutes } from "@avd/shared/config";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { runGenerationById } from "@avd/gen";
import { putObject } from "@avd/ast/storage";
import {
  attachMusicTrack, getMusicBrief, materializeGenerationOutput, requestTranscript, upsertMusicBriefForTest,
} from "../src/service";
import { musicBrief } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "Transcript Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Transcript", aspectRatio: "16:9", targetDurationS: "30",
  });
});

afterAll(async () => {
  await db.delete(musicBrief).where(eq(musicBrief.projectId, projectId));
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(asset).where(eq(asset.organizationId, orgId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-GEN-020: transcribe the attached track with MM:SS timestamps", () => {
  it("audio ref reaches the provider; transcript lands on the music brief", async () => {
    await upsertMusicBriefForTest(db, { projectId, prompt: "a song" });
    const trackId = uuidv7();
    await putObject(`test-tr/${trackId}.mp3`, new Uint8Array([73, 68, 51, 3, 0]), "audio/mpeg");
    await db.insert(asset).values({
      id: trackId, organizationId: orgId, kind: "audio", source: "uploaded", status: "ready",
      storageKey: `test-tr/${trackId}.mp3`, mime: "audio/mpeg",
    });
    await attachMusicTrack(db, { projectId, assetId: trackId });

    const genId = await requestTranscript(db, { projectId, principal: "u" });
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(g!.kind).toBe("transcript");
    expect(g!.modelId).toBe(modelRoutes.transcript);
    expect((g!.promptSnapshot as { refs?: { audioAssetId?: string } }).refs?.audioAssetId).toBe(trackId);
    expect((g!.promptSnapshot as { prompt: string }).prompt).toMatch(/MM:SS/);

    await runGenerationById(db, genId);
    const m = (await materializeGenerationOutput(db, genId)) as { kind: string };
    expect(m.kind).toBe("transcript");
    const brief = await getMusicBrief(db, projectId);
    expect(brief!.transcript).toBeTruthy();
    expect(brief!.transcript).toMatch(/\d{2}:\d{2}/); // mock fixture carries timestamps
  });

  it("rejects when no track is attached", async () => {
    const other = uuidv7();
    await db.insert(project).values({
      id: other, organizationId: orgId, title: "NoTrack", aspectRatio: "16:9", targetDurationS: "12",
    });
    await upsertMusicBriefForTest(db, { projectId: other, prompt: "x" });
    await expect(requestTranscript(db, { projectId: other, principal: "u" })).rejects.toMatchObject({ code: "not_found" });
    await db.delete(musicBrief).where(eq(musicBrief.projectId, other));
    await db.delete(project).where(eq(project.id, other));
  });
});
