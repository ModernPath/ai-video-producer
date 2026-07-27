// REQ-ANM-003 slice 2 — animated caption overlay reaches the EXPORT. Gated RUN_RENDER
// (Remotion + docker ffmpeg). The burned path stays default; "animated" composites the
// cue-timed alpha overlay rendered by @avd/anm over the whole cut.
import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import { createShot, materializeGenerationOutput, requestTake, selectTake } from "@avd/stb";
import { frameCandidate, musicBrief, shot, take } from "@avd/stb/schema";
import { exportJob, storyboardSnapshot } from "../src/schema";
import { createSnapshot, queueExport, runNextExport } from "../src/service";
import { migrate } from "@avd/shared/migrate";

describe.skipIf(!process.env.RUN_RENDER)("REQ-ANM-003 slice 2: animated captions in the export", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "AnimCap Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "AnimCap", aspectRatio: "16:9", targetDurationS: "10",
    });
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "one shot", durationS: 6,
      direction: { synopsis: "x", subject: "s", action: "a" },
    });
    const genId = await requestTake(db, { shotId, principal: "user:test", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    const m = await materializeGenerationOutput(db, genId);
    await selectTake(db, { shotId, takeId: m!.id });
    // lyric transcript with an EARLY lyric line (inside the 6s cut)
    await db.insert(musicBrief).values({
      id: uuidv7(), projectId, prompt: "test brief",
      transcript: "[00:00] [Intro]\n[00:01] neon rivers run",
    });
  }, 120_000);

  afterAll(async () => {
    await db.delete(exportJob).where(eq(exportJob.projectId, projectId));
    await db.delete(storyboardSnapshot).where(eq(storyboardSnapshot.projectId, projectId));
    await db.delete(musicBrief).where(eq(musicBrief.projectId, projectId));
    const shotIds = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
    if (shotIds.length) {
      await db.delete(take).where(inArray(take.shotId, shotIds));
      await db.delete(frameCandidate).where(inArray(frameCandidate.shotId, shotIds));
    }
    await db.delete(shot).where(eq(shot.projectId, projectId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("captionStyle=animated -> export succeeds via the overlay path (bigger than a bare copy)", async () => {
    const snapId = await createSnapshot(db, {
      projectId, principal: "user:test", burnCaptions: true, captionStyle: "animated",
    });
    const [snap] = await db.select().from(storyboardSnapshot).where(eq(storyboardSnapshot.id, snapId));
    expect((snap!.audio as { captionStyle?: string }).captionStyle).toBe("animated");
    await queueExport(db, { projectId, snapshotId: snapId, principal: "user:test" });
    const result = await runNextExport(db, { organizationId: orgId });
    expect(result?.status).toBe("succeeded");
    const [job] = await db.select().from(exportJob).where(eq(exportJob.id, result!.jobId));
    const [out] = await db.select().from(asset).where(eq(asset.id, job!.outputAssetId!));
    expect(out?.mime).toBe("video/mp4");
    expect(Number(out?.bytes)).toBeGreaterThan(5_000); // composited output, not an empty copy
  }, 600_000);
});
