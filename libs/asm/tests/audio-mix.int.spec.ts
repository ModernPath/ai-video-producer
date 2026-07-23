import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { assetKey, getObject, putObject } from "@avd/ast/storage";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import {
  attachMusicTrack, createShot, materializeGenerationOutput, requestMusicBrief, requestTake, selectTake,
} from "@avd/stb";
import { frameCandidate, musicBrief, shot, take } from "@avd/stb/schema";
import { createSnapshot, queueExport, runExportById } from "../src/service";
import { exportJob, storyboardSnapshot } from "../src/schema";
import { migrate } from "../../../scripts/migrate";

const exec = promisify(execFile);

async function ffprobe(bytes: Uint8Array, dir: string): Promise<{ audioStreams: number; audioCodecs: string[]; durationS: number }> {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const f = join(dir, "probe.mp4");
  writeFileSync(f, Buffer.from(bytes));
  const { stdout } = await exec("docker", [
    "run", "--rm", "-v", `${dir}:/work`, "--entrypoint", "ffprobe",
    "jrottenberg/ffmpeg:6.1-alpine",
    "-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", "/work/probe.mp4",
  ]);
  const info = JSON.parse(stdout) as { streams: Array<{ codec_type: string; codec_name: string }>; format: { duration: string } };
  return {
    audioStreams: info.streams.filter((s) => s.codec_type === "audio").length,
    audioCodecs: info.streams.filter((s) => s.codec_type === "audio").map((s) => s.codec_name),
    durationS: Number(info.format.duration),
  };
}

// REQ-ASM-004 — audio mix modes (requires compose pg+minio and docker ffmpeg/ffprobe).
describe("ASM audio mix modes", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  const workDir = join(process.cwd(), "data", "test-probe", orgId);

  async function exportWithMode(mode: "native" | "music" | "mix") {
    await db.update(project).set({ audioMixMode: mode }).where(eq(project.id, projectId));
    const snapId = await createSnapshot(db, { projectId, principal: "user:test" });
    const [snap] = await db.select().from(storyboardSnapshot).where(eq(storyboardSnapshot.id, snapId));
    const audio = snap!.audio as { mixMode?: string; musicAssetId?: string };
    expect(audio.mixMode).toBe(mode); // snapshot captures audio config (INV-ASM-001)
    if (mode !== "native") expect(audio.musicAssetId).toBeTruthy();
    const jobId = await queueExport(db, { projectId, snapshotId: snapId, principal: "user:test" });
    const res = await runExportById(db, jobId);
    const [job] = await db.select().from(exportJob).where(eq(exportJob.id, jobId));
    if (res?.status !== "succeeded") throw new Error(`export failed: ${job?.errorDetail}`);
    const [out] = await db.select().from(asset).where(eq(asset.id, job!.outputAssetId!));
    return getObject(out!.storageKey);
  }

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Mix Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Mix Proj", aspectRatio: "16:9", targetDurationS: "10",
    });
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "one", durationS: 6,
      direction: { synopsis: "s", subject: "x", action: "a" },
    });
    const genId = await requestTake(db, { shotId, principal: "user:test", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    const m = await materializeGenerationOutput(db, genId);
    await selectTake(db, { shotId, takeId: m!.id });

    // music brief + attach fixture mp3
    const mbGen = await requestMusicBrief(db, { projectId, principal: "user:test" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, mbGen);
    const trackId = uuidv7();
    const mp3 = new Uint8Array(readFileSync(join(process.cwd(), "fixtures", "track-30s.mp3")));
    const key = assetKey(orgId, projectId, trackId, "mp3");
    await putObject(key, mp3, "audio/mpeg");
    await db.insert(asset).values({
      id: trackId, organizationId: orgId, projectId, kind: "audio", source: "uploaded",
      status: "ready", storageKey: key, mime: "audio/mpeg", bytes: mp3.byteLength,
    });
    await attachMusicTrack(db, { projectId, assetId: trackId });
  }, 120_000);

  afterAll(async () => {
    const { rmSync } = await import("node:fs");
    rmSync(workDir, { recursive: true, force: true });
    await db.delete(exportJob).where(eq(exportJob.projectId, projectId));
    await db.delete(storyboardSnapshot).where(eq(storyboardSnapshot.projectId, projectId));
    const shotIds = (await db.select().from(shot).where(eq(shot.projectId, projectId))).map((s) => s.id);
    if (shotIds.length) {
      await db.delete(take).where(inArray(take.shotId, shotIds));
      await db.delete(frameCandidate).where(inArray(frameCandidate.shotId, shotIds));
    }
    await db.delete(shot).where(eq(shot.projectId, projectId));
    await db.delete(musicBrief).where(eq(musicBrief.projectId, projectId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("music mode: one audio stream, duration ≈ cut length (not the 30s track)", async () => {
    const obj = await exportWithMode("music");
    const info = await ffprobe(obj.bytes, join(workDir, "music"));
    expect(info.audioStreams).toBe(1);
    expect(info.audioCodecs).toEqual(["mp3"]); // audio replaced by the mp3 track (copy), not take AAC
    expect(info.durationS).toBeGreaterThan(5.5);
    expect(info.durationS).toBeLessThan(7); // trimmed to the 6s shot (REQ-ASM-005), not the 30s music
  }, 120_000);

  it("mix mode: audio present, export succeeds with ducked bed", async () => {
    const obj = await exportWithMode("mix");
    const info = await ffprobe(obj.bytes, join(workDir, "mix"));
    expect(info.audioStreams).toBe(1);
    expect(info.audioCodecs).toEqual(["aac"]); // re-encoded amix of native + ducked music
  }, 120_000);

  it("native mode unchanged", async () => {
    const obj = await exportWithMode("native");
    const info = await ffprobe(obj.bytes, join(workDir, "native"));
    expect(info.audioStreams).toBe(1);
    expect(info.audioCodecs).toEqual(["aac"]); // untouched take audio
  }, 120_000);
});
