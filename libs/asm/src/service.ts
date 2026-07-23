// REQ-ASM-001 (snapshot) + REQ-ASM-002/003 (export). ASM reads STB/AST tables read-only
// per docs/02 §4 (allowed readers); it writes only asm.* and export output assets.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { asset } from "@avd/ast/schema";
import { getObject, putObject } from "@avd/ast/storage";
import { shot, take } from "@avd/stb/schema";
import { exportJob, storyboardSnapshot } from "./schema";

const exec = promisify(execFile);

export class AsmValidationError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export interface SnapshotItem {
  shotId: string;
  position: number;
  takeId: string;
  videoAssetId: string;
  durationS: number;
}

export async function createSnapshot(db: Db, input: { projectId: string; principal: string }): Promise<string> {
  const shots = await db
    .select()
    .from(shot)
    .where(and(eq(shot.projectId, input.projectId), isNull(shot.deletedAt)))
    .orderBy(asc(shot.position));
  if (!shots.length) throw new AsmValidationError("empty_storyboard", "No shots to assemble");

  const missing = shots.filter((s) => !s.selectedTakeId);
  if (missing.length) {
    throw new AsmValidationError(
      "missing_takes",
      `Shots without a selected take: ${missing.map((s) => `"${s.title}"`).join(", ")}` // INV-ASM-002
    );
  }

  const takes = await db.select().from(take).where(inArray(take.id, shots.map((s) => s.selectedTakeId!)));
  const takeById = new Map(takes.map((t) => [t.id, t]));
  const dangling = shots.filter((s) => !takeById.has(s.selectedTakeId!));
  if (dangling.length) {
    throw new AsmValidationError(
      "missing_takes",
      `Selected takes no longer exist for: ${dangling.map((s) => `"${s.title}"`).join(", ")} — reselect or regenerate`
    );
  }
  const assets = await db.select().from(asset).where(inArray(asset.id, takes.map((t) => t.videoAssetId)));
  const notReady = assets.filter((a) => a.status !== "ready");
  if (notReady.length) throw new AsmValidationError("asset_not_ready", "Selected take assets not ready");

  const items: SnapshotItem[] = shots.map((s) => {
    const t = takeById.get(s.selectedTakeId!)!;
    return {
      shotId: s.id,
      position: s.position,
      takeId: t.id,
      videoAssetId: t.videoAssetId,
      durationS: Number(t.durationActualS ?? s.durationS),
    };
  });

  const id = uuidv7();
  await db.insert(storyboardSnapshot).values({
    id,
    organizationId: shots[0]!.organizationId,
    projectId: input.projectId,
    items,
    createdBy: input.principal,
  });
  return id;
}

export async function queueExport(db: Db, input: { projectId: string; snapshotId: string; principal: string }): Promise<string> {
  const [snap] = await db.select().from(storyboardSnapshot).where(eq(storyboardSnapshot.id, input.snapshotId));
  if (!snap) throw new AsmValidationError("not_found", "Snapshot not found");
  const id = uuidv7();
  await db.insert(exportJob).values({
    id,
    organizationId: snap.organizationId,
    projectId: input.projectId,
    snapshotId: input.snapshotId,
  });
  return id;
}

function workDir(): string {
  const candidates = [process.env.EXPORT_TMP_DIR, join(process.cwd(), "data"), join(process.cwd(), "..", "..", "data")]
    .filter((p): p is string => !!p);
  for (const dir of candidates) {
    const parent = dir.endsWith("data") ? dir.slice(0, -5) : dir;
    if (existsSync(parent)) {
      const d = join(dir, "export-tmp");
      mkdirSync(d, { recursive: true });
      return d;
    }
  }
  throw new Error("no writable work dir found for export");
}

/** ffmpeg via docker image — worker container bakes ffmpeg in prod (ADR-007). */
async function ffmpegConcat(dir: string, inputFiles: string[], outFile: string): Promise<void> {
  const listPath = join(dir, "concat.txt");
  writeFileSync(listPath, inputFiles.map((f) => `file '${f}'`).join("\n"));
  await exec("docker", [
    "run", "--rm", "-v", `${dir}:/work`,
    "jrottenberg/ffmpeg:6.1-alpine",
    "-f", "concat", "-safe", "0", "-i", "/work/concat.txt",
    "-c", "copy", "-movflags", "+faststart", "-y", `/work/${outFile}`,
  ]);
}

export interface ExportResult {
  jobId: string;
  status: "succeeded" | "failed";
}

export async function runNextExport(db: Db, opts: { organizationId?: string } = {}): Promise<ExportResult | null> {
  const scope = opts.organizationId
    ? and(eq(exportJob.status, "queued"), eq(exportJob.organizationId, opts.organizationId))
    : eq(exportJob.status, "queued");
  const [job] = await db.select().from(exportJob).where(scope).orderBy(asc(exportJob.createdAt)).limit(1);
  if (!job) return null;

  await db.update(exportJob).set({ status: "running", startedAt: new Date(), progressStage: "fetch" }).where(eq(exportJob.id, job.id));
  const dir = join(workDir(), job.id);
  mkdirSync(dir, { recursive: true });

  try {
    const [snap] = await db.select().from(storyboardSnapshot).where(eq(storyboardSnapshot.id, job.snapshotId));
    const items = snap!.items as SnapshotItem[];
    const assets = await db.select().from(asset).where(inArray(asset.id, items.map((i) => i.videoAssetId)));
    const assetById = new Map(assets.map((a) => [a.id, a]));

    const files: string[] = [];
    for (const [i, item] of items.entries()) {
      const a = assetById.get(item.videoAssetId)!;
      const obj = await getObject(a.storageKey);
      const name = `clip-${String(i).padStart(3, "0")}.mp4`;
      writeFileSync(join(dir, name), Buffer.from(obj.bytes)); // INV-ASM-003: assets in, no generation
      files.push(name);
    }

    await db.update(exportJob).set({ progressStage: "concat" }).where(eq(exportJob.id, job.id));
    await ffmpegConcat(dir, files, "final.mp4");

    const outBytes = new Uint8Array(readFileSync(join(dir, "final.mp4")));
    const outAssetId = uuidv7();
    const key = `${job.organizationId}/${job.projectId}/exports/${job.id}/final.mp4`; // docs/12 §5
    await db.update(exportJob).set({ progressStage: "store" }).where(eq(exportJob.id, job.id));
    await putObject(key, outBytes, "video/mp4");
    await db.insert(asset).values({
      id: outAssetId,
      organizationId: job.organizationId,
      projectId: job.projectId,
      kind: "video",
      source: "generated",
      status: "ready",
      storageKey: key,
      mime: "video/mp4",
      bytes: outBytes.byteLength,
      durationS: String(items.reduce((acc, i) => acc + i.durationS, 0)),
    });
    await db.update(exportJob)
      .set({ status: "succeeded", outputAssetId: outAssetId, progressStage: "done", finishedAt: new Date() })
      .where(eq(exportJob.id, job.id));
    return { jobId: job.id, status: "succeeded" };
  } catch (err) {
    await db.update(exportJob)
      .set({ status: "failed", errorDetail: String(err), finishedAt: new Date() }) // INV-ASM-004
      .where(eq(exportJob.id, job.id));
    return { jobId: job.id, status: "failed" };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
