import { execFile } from "node:child_process";
import { readFileSync, writeFileSync as wfs, mkdirSync } from "node:fs";
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
import { createShot, selectTake } from "@avd/stb";
import { frameCandidate, shot, take } from "@avd/stb/schema";
import { createSnapshot, queueExport, runExportById } from "../src/service";
import { exportJob, storyboardSnapshot } from "../src/schema";
import { migrate } from "@avd/shared/migrate";

const exec = promisify(execFile);

// REQ-ASM-005 — heterogeneous takes normalize to one profile; durations trim to shots.
describe("ASM normalization", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  const workDir = join(process.cwd(), "data", "test-norm", orgId);

  async function makeShotWithTakeAsset(title: string, durationS: number, bytes: Uint8Array) {
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title, durationS,
      direction: { synopsis: title, subject: "s", action: "a" },
    });
    const assetId = uuidv7();
    const key = assetKey(orgId, projectId, assetId, "mp4");
    await putObject(key, bytes, "video/mp4");
    await db.insert(asset).values({
      id: assetId, organizationId: orgId, projectId, kind: "video", source: "generated",
      status: "ready", storageKey: key, mime: "video/mp4", bytes: bytes.byteLength, durationS: String(durationS),
    });
    const takeId = uuidv7();
    await db.insert(take).values({ id: takeId, shotId, videoAssetId: assetId, generationId: uuidv7(), durationActualS: String(durationS) });
    await selectTake(db, { shotId, takeId });
  }

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    mkdirSync(workDir, { recursive: true });
    await db.insert(organization).values({ id: orgId, name: "Norm Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Norm Proj", aspectRatio: "16:9", targetDurationS: "11",
    });
    // clip A: repo fixture 640x360 10s; clip B: generate 1280x720 10s on the fly
    const a = new Uint8Array(readFileSync(join(process.cwd(), "fixtures", "take-10s.mp4")));
    await exec("docker", [
      "run", "--rm", "-v", `${workDir}:/out`, "jrottenberg/ffmpeg:6.1-alpine",
      "-f", "lavfi", "-i", "testsrc2=duration=10:size=1280x720:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=10",
      "-shortest", "-pix_fmt", "yuv420p", "-y", "/out/hd-10s.mp4",
    ]);
    const b = new Uint8Array(readFileSync(join(workDir, "hd-10s.mp4")));
    await makeShotWithTakeAsset("low-res six", 6, a);
    await makeShotWithTakeAsset("hd five", 5, b);
  }, 180_000);

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
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("mixed-res takes export as one uniform 1280x720 stream trimmed to shot durations", async () => {
    const snapId = await createSnapshot(db, { projectId, principal: "user:test" });
    const jobId = await queueExport(db, { projectId, snapshotId: snapId, principal: "user:test" });
    const res = await runExportById(db, jobId);
    const [job] = await db.select().from(exportJob).where(eq(exportJob.id, jobId));
    if (res?.status !== "succeeded") throw new Error(`export failed: ${job?.errorDetail}`);
    const [out] = await db.select().from(asset).where(eq(asset.id, job!.outputAssetId!));
    const obj = await getObject(out!.storageKey);
    const probeDir = join(workDir, "probe");
    mkdirSync(probeDir, { recursive: true });
    wfs(join(probeDir, "probe.mp4"), Buffer.from(obj.bytes));
    const { stdout } = await exec("docker", [
      "run", "--rm", "-v", `${probeDir}:/work`, "--entrypoint", "ffprobe",
      "jrottenberg/ffmpeg:6.1-alpine",
      "-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", "/work/probe.mp4",
    ]);
    const info = JSON.parse(stdout) as {
      streams: Array<{ codec_type: string; width?: number; height?: number }>;
      format: { duration: string };
    };
    const video = info.streams.filter((s) => s.codec_type === "video");
    expect(video.length).toBe(1);
    expect(video[0]!.width).toBe(1280);
    expect(video[0]!.height).toBe(720);
    expect(Number(info.format.duration)).toBeGreaterThan(10);
    expect(Number(info.format.duration)).toBeLessThan(12.5); // 6+5=11s trim, not 20s of source
  }, 180_000);
});
