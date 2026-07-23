// REQ-AST-005 / BR-AST-002: derivative thumbnails (images) and posters (videos) on ready.
// ffmpeg via docker like ASM's export pipeline (ADR-007: worker container bakes ffmpeg in prod).
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { asset } from "./schema";
import { getObject, putObject } from "./storage";

const exec = promisify(execFile);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm",
};

/**
 * Generates a small JPEG derivative for a ready asset: a downscaled thumb for images,
 * a first-frame poster for videos. Idempotent; failures never break the caller
 * (a missing thumb only means the UI falls back to the original).
 */
export async function makeAssetThumb(db: Db, assetId: string): Promise<void> {
  const [a] = await db.select().from(asset).where(eq(asset.id, assetId));
  if (!a || a.status !== "ready" || a.thumbStorageKey) return;
  if (a.kind !== "image" && a.kind !== "video") return;
  if (!EXT_BY_MIME[a.mime]) return; // e.g. svg mock fixtures — ffmpeg can't rasterize; UI falls back to original

  const dir = mkdtempSync(join(tmpdir(), "avd-thumb-"));
  try {
    const { bytes } = await getObject(a.storageKey);
    const ext = EXT_BY_MIME[a.mime] ?? "bin";
    const inFile = `in.${ext}`;
    writeFileSync(join(dir, inFile), bytes);
    const { thumbWidth, jpegQuality } = config.derivative;
    const videoArgs = a.kind === "video" ? ["-frames:v", "1"] : [];
    await exec("docker", [
      "run", "--rm", "-v", `${dir}:/work`, "jrottenberg/ffmpeg:6.1-alpine",
      "-y", "-i", `/work/${inFile}`,
      ...videoArgs,
      "-vf", `scale=${thumbWidth}:-2`,
      "-q:v", String(jpegQuality),
      "/work/thumb.jpg",
    ]);
    const thumbKey = `${a.storageKey}.thumb.jpg`;
    await putObject(thumbKey, readFileSync(join(dir, "thumb.jpg")), "image/jpeg");
    await db.update(asset).set({ thumbStorageKey: thumbKey }).where(eq(asset.id, a.id));
  } catch (err) {
    console.warn(`thumb generation failed for asset ${assetId}:`, (err as Error).message?.slice(0, 200));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
