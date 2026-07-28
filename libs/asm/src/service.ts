// REQ-ASM-001 (snapshot) + REQ-ASM-002/003 (export). ASM reads STB/AST tables read-only
// per docs/02 §4 (allowed readers); it writes only asm.* and export output assets.
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { asset } from "@avd/ast/schema";
import { getObject, putObject } from "@avd/ast/storage";
import { musicBrief, shot, take } from "@avd/stb/schema";
import { project } from "@avd/prj/schema";
import { getProjectStatus } from "@avd/prj/service";
import { config } from "@avd/shared/config";
import { runFfmpeg } from "@avd/shared/ffmpeg";
import { exportJob, storyboardSnapshot } from "./schema";
import { transcriptToSrt } from "./captions";

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

export async function createSnapshot(
  db: Db,
  input: { projectId: string; principal: string; excludeShotIds?: string[]; burnCaptions?: boolean; captionSource?: "lyrics" | "dialogue"; captionStyle?: "burned" | "animated" }
): Promise<string> {
  const status = await getProjectStatus(db, input.projectId); // BR-PRJ-003: archived projects are read-only
  if (status === "archived") throw new AsmValidationError("project_archived", "Project is archived — unarchive to export");
  const allShots = await db
    .select()
    .from(shot)
    .where(and(eq(shot.projectId, input.projectId), isNull(shot.deletedAt)))
    .orderBy(asc(shot.position));
  if (!allShots.length) throw new AsmValidationError("empty_storyboard", "No shots to assemble");

  // REQ-ASM-008: exclusions must be explicit and must reference real shots.
  const excludeIds = new Set(input.excludeShotIds ?? []);
  const knownIds = new Set(allShots.map((s) => s.id));
  const unknown = [...excludeIds].filter((id) => !knownIds.has(id));
  if (unknown.length) throw new AsmValidationError("not_found", "Excluded shot not found in this storyboard");

  const excluded = allShots.filter((s) => excludeIds.has(s.id)).map((s) => ({ shotId: s.id, title: s.title }));
  const shots = allShots.filter((s) => !excludeIds.has(s.id));
  if (!shots.length) throw new AsmValidationError("empty_storyboard", "Every shot is excluded — nothing to assemble");

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

  const [proj] = await db.select().from(project).where(eq(project.id, input.projectId));
  const [mb] = await db.select().from(musicBrief).where(eq(musicBrief.projectId, input.projectId));
  const mixMode = proj?.audioMixMode ?? "native";
  const audio = {
    mixMode: mb?.activeTrackAssetId ? mixMode : "native", // no track -> native (BR-ASM-001)
    musicAssetId: mb?.activeTrackAssetId ?? null,
    duckDb: config.audio.duckDb,
    fadeOutS: config.audio.fadeOutSeconds,
    // REQ-ASM-009/REQ-GEN-021: captions — "lyrics" burns the music transcript; "dialogue"
    // transcribes the export's own audio at render time. Captured immutably in the snapshot.
    captionSource: input.burnCaptions ? (input.captionSource ?? "lyrics") : null,
    burnCaptions: Boolean(input.burnCaptions && (input.captionSource === "dialogue" || mb?.transcript)),
    transcript: input.burnCaptions && (input.captionSource ?? "lyrics") === "lyrics" ? (mb?.transcript ?? null) : null,
    captionStyle: input.burnCaptions ? (input.captionStyle ?? "burned") : null, // REQ-ANM-003 slice 2
  };

  const id = uuidv7();
  await db.insert(storyboardSnapshot).values({
    id,
    organizationId: shots[0]!.organizationId,
    projectId: input.projectId,
    items,
    audio,
    excluded,
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

/** ffmpeg via the shared runner — native binary in the deployed image (ADR-014). */
async function ffmpegConcat(dir: string, inputFiles: string[], outFile: string): Promise<void> {
  const listPath = join(dir, "concat.txt");
  writeFileSync(listPath, inputFiles.map((f) => `file '${f}'`).join("\n"));
  await runFfmpeg(dir, [
    "-f", "concat", "-safe", "0", "-i", "/work/concat.txt",
    "-c", "copy", "-movflags", "+faststart", "-y", `/work/${outFile}`,
  ]);
}

/** REQ-ASM-006 / INV-ASM-004: retry a failed export as a new job on the same snapshot. */
export async function retryExport(db: Db, input: { exportJobId: string; principal: string }): Promise<string> {
  const [src] = await db.select().from(exportJob).where(eq(exportJob.id, input.exportJobId));
  if (!src) throw new AsmValidationError("not_found", "Export job not found");
  if (src.status !== "failed") throw new AsmValidationError("conflict", "Only failed exports can be retried");
  const id = uuidv7();
  await db.insert(exportJob).values({
    id,
    organizationId: src.organizationId,
    projectId: src.projectId,
    snapshotId: src.snapshotId, // same immutable snapshot (INV-ASM-001)
    preset: src.preset,
  });
  return id;
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
  return processExportJob(db, job);
}

/** Executes a specific export job by id (worker path, REQ-GEN-016). */
export async function runExportById(db: Db, exportJobId: string): Promise<ExportResult | null> {
  const [job] = await db.select().from(exportJob).where(eq(exportJob.id, exportJobId));
  if (!job || job.status !== "queued") return null;
  return processExportJob(db, job);
}

async function processExportJob(db: Db, job: typeof exportJob.$inferSelect): Promise<ExportResult> {
  await db.update(exportJob).set({ status: "running", startedAt: new Date(), progressStage: "fetch" }).where(eq(exportJob.id, job.id));
  const dir = join(workDir(), job.id);
  mkdirSync(dir, { recursive: true });

  try {
    const [snap] = await db.select().from(storyboardSnapshot).where(eq(storyboardSnapshot.id, job.snapshotId));
    const items = snap!.items as SnapshotItem[];
    const assets = await db.select().from(asset).where(inArray(asset.id, items.map((i) => i.videoAssetId)));
    const assetById = new Map(assets.map((a) => [a.id, a]));

    const [projRow] = await db.select().from(project).where(eq(project.id, job.projectId));
    const aspect = (projRow?.aspectRatio ?? "16:9") as "16:9" | "9:16";
    const profile = config.asm.normalize[aspect];
    const fps = config.asm.normalize.fps;
    const audioHz = config.asm.normalize.audioHz;

    const files: string[] = [];
    for (const [i, item] of items.entries()) {
      const a = assetById.get(item.videoAssetId)!;
      const obj = await getObject(a.storageKey);
      const raw = `raw-${String(i).padStart(3, "0")}.mp4`;
      const name = `clip-${String(i).padStart(3, "0")}.mp4`;
      writeFileSync(join(dir, raw), Buffer.from(obj.bytes)); // INV-ASM-003: assets in, no generation
      // REQ-ASM-005 / BR-ASM-003: normalize to one profile and trim to the shot's duration (OQ-104 policy)
      await runFfmpeg(dir, [
        "-i", `/work/${raw}`,
        "-t", String(item.durationS),
        "-vf", `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2,fps=${fps}`,
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", String(audioHz), "-ac", "2",
        "-movflags", "+faststart", "-y", `/work/${name}`,
      ]);
      files.push(name);
      await db.update(exportJob).set({ progressStage: `normalize ${i + 1}/${items.length}` }).where(eq(exportJob.id, job.id));
    }

    await db.update(exportJob).set({ progressStage: "concat" }).where(eq(exportJob.id, job.id));
    const audio = (snap!.audio ?? {}) as { mixMode?: string; musicAssetId?: string | null; duckDb?: number; fadeOutS?: number; burnCaptions?: boolean; transcript?: string | null; captionSource?: "lyrics" | "dialogue" | null; captionStyle?: "burned" | "animated" | null };
    const needsMusic = (audio.mixMode === "music" || audio.mixMode === "mix") && audio.musicAssetId;
    const needsCaptions = Boolean(audio.burnCaptions && (audio.transcript || audio.captionSource === "dialogue"));
    const afterMusicName = needsCaptions ? "precap.mp4" : "final.mp4";
    await ffmpegConcat(dir, files, needsMusic ? "base.mp4" : afterMusicName);

    if (needsMusic) {
      await db.update(exportJob).set({ progressStage: "mix" }).where(eq(exportJob.id, job.id));
      const [musicAsset] = await db.select().from(asset).where(eq(asset.id, audio.musicAssetId!));
      const music = await getObject(musicAsset!.storageKey);
      writeFileSync(join(dir, "music.mp3"), Buffer.from(music.bytes));
      const cutS = items.reduce((acc, i) => acc + i.durationS, 0);
      const fade = audio.fadeOutS ?? 2;
      const duckLinear = Math.pow(10, (audio.duckDb ?? -12) / 20);
      const args =
        audio.mixMode === "music"
          ? [ // replace take audio with the track, fade out at the cut end (BR-ASM-001/002)
              // aac, not mp3: mp3-in-mp4 plays silent in QuickTime/AVFoundation (USER BUG 2026-07-24)
              "-i", "/work/base.mp4", "-i", "/work/music.mp3",
              "-map", "0:v", "-map", "1:a",
              "-c:v", "copy", "-c:a", "aac",
              "-af", `afade=t=out:st=${Math.max(0, cutS - fade)}:d=${fade}`,
              "-shortest", "-movflags", "+faststart", "-y", `/work/${afterMusicName}`,
            ]
          : [ // mix: music bed ducked under native audio
              "-i", "/work/base.mp4", "-i", "/work/music.mp3",
              "-filter_complex", `[1:a]volume=${duckLinear.toFixed(3)}[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]`,
              "-map", "0:v", "-map", "[a]",
              "-c:v", "copy", "-c:a", "aac",
              "-shortest", "-movflags", "+faststart", "-y", `/work/${afterMusicName}`,
            ];
      await runFfmpeg(dir, args);
    }

    if (needsCaptions) {
      // REQ-ASM-009: burn MM:SS captions (SRT via libass); host font mounted for alpine ffmpeg
      await db.update(exportJob).set({ progressStage: "captions" }).where(eq(exportJob.id, job.id));
      const cutS = items.reduce((acc, i) => acc + i.durationS, 0);
      let transcriptText = audio.transcript ?? null;
      if (audio.captionSource === "dialogue") {
        // REQ-GEN-021: transcribe the export's OWN audio — spoken words, not lyrics
        await runFfmpeg(dir, [
          "-i", "/work/precap.mp4", "-vn", "-c:a", "libmp3lame", "-y", "/work/dialogue.mp3",
        ]);
        const { transcribeAudio } = await import("@avd/gen");
        transcriptText = await transcribeAudio(new Uint8Array(readFileSync(join(dir, "dialogue.mp3"))), "audio/mpeg");
      }
      if (audio.captionStyle === "animated" && transcriptText) {
        // REQ-ANM-003 slice 2: Remotion-animated captions — cue-timed alpha overlay composited
        // over the whole cut, instead of the static libass burn. Same timing source as SRT.
        const { transcriptToCues } = await import("./captions");
        const cues = transcriptToCues(transcriptText, cutS, { lyricsOnly: audio.captionSource !== "dialogue" });
        if (cues.length) {
          const { renderAnimation } = await import("@avd/anm/render");
          const { compositeOverlay } = await import("@avd/anm/composite");
          const overlay = await renderAnimation({
            template: "captions", text: "", cues, durationS: cutS, aspectRatio: "16:9",
          });
          const composed = await compositeOverlay({
            videoBytes: new Uint8Array(readFileSync(join(dir, "precap.mp4"))),
            overlayWebmBytes: overlay.bytes,
            durationS: cutS,
          });
          writeFileSync(join(dir, "final.mp4"), Buffer.from(composed.bytes));
        } else {
          copyFileSync(join(dir, "precap.mp4"), join(dir, "final.mp4"));
        }
        // fall through to store below
      } else {
      const srt = transcriptText ? transcriptToSrt(transcriptText, cutS) : "";
      if (srt) {
        writeFileSync(join(dir, "caps.srt"), srt);
        mkdirSync(join(dir, "fonts"), { recursive: true });
        copyFileSync(config.asm.captions.fontFile, join(dir, "fonts", "caption-font.ttf"));
        await runFfmpeg(dir, [
          "-i", "/work/precap.mp4",
          "-vf", `subtitles=/work/caps.srt:fontsdir=/work/fonts:force_style='${config.asm.captions.style}'`,
          "-c:a", "copy", "-movflags", "+faststart", "-y", "/work/final.mp4",
        ]);
      } else {
        copyFileSync(join(dir, "precap.mp4"), join(dir, "final.mp4"));
      }
      } // end burned-style branch (REQ-ANM-003)
    }

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
