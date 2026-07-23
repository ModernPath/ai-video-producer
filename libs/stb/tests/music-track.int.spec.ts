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
import { getMusicBrief, materializeGenerationOutput, requestMusicTrack, upsertMusicBriefForTest } from "../src/service";
import { musicBrief } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "MusicTrack Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "MusicTrack", aspectRatio: "16:9", targetDurationS: "30",
  });
});

afterAll(async () => {
  await db.delete(musicBrief).where(eq(musicBrief.projectId, projectId));
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(asset).where(eq(asset.organizationId, orgId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-GEN-019: Lyria music track from the brief", () => {
  it("brief prompt goes verbatim to the music model; audio asset attaches as the active track", async () => {
    await upsertMusicBriefForTest(db, { projectId, prompt: "upbeat indie pop, 122 BPM. [Verse] shipping day..." });

    const genId = await requestMusicTrack(db, { projectId, principal: "u" });
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(g!.kind).toBe("music");
    expect(g!.modelId).toBe(modelRoutes.music);
    expect((g!.promptSnapshot as { prompt: string }).prompt).toBe("upbeat indie pop, 122 BPM. [Verse] shipping day...");

    await runGenerationById(db, genId);
    const m = (await materializeGenerationOutput(db, genId)) as { kind: string; id: string };
    expect(m.kind).toBe("music");

    const brief = await getMusicBrief(db, projectId);
    expect(brief!.activeTrackAssetId).toBeTruthy();
    const [a] = await db.select().from(asset).where(eq(asset.id, brief!.activeTrackAssetId!));
    expect(a!.kind).toBe("audio");
    expect(a!.mime).toContain("audio");
    expect(a!.status).toBe("ready");
  });

  it("rejects when no brief exists", async () => {
    const otherProject = uuidv7();
    await db.insert(project).values({
      id: otherProject, organizationId: orgId, title: "NoBrief", aspectRatio: "16:9", targetDurationS: "12",
    });
    await expect(requestMusicTrack(db, { projectId: otherProject, principal: "u" })).rejects.toMatchObject({ code: "not_found" });
    await db.delete(project).where(eq(project.id, otherProject));
  });
});
