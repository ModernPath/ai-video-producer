// REQ-STB-039 support — real media duration on the asset row.
// The workspace timeline compares the cut against the attached track, which needs the track's
// true length; audio assets were created with duration_s NULL, so drift could never be shown.
// ffprobe ships in the same image the exporter already uses (ADR-007).
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import type { Db } from "@avd/shared/db";
import { asset } from "./schema";

const exec = promisify(execFile);

/** Seconds (1 decimal) or null when the media can't be probed — never throws into a caller's flow. */
export async function probeDurationS(bytes: Uint8Array, ext = "mp3"): Promise<number | null> {
  const dir = mkdtempSync(join(tmpdir(), "avd-probe-"));
  const file = `media.${ext}`;
  try {
    writeFileSync(join(dir, file), Buffer.from(bytes));
    const { stdout } = await exec("docker", [
      "run", "--rm", "-v", `${dir}:/work`, "--entrypoint", "ffprobe", "jrottenberg/ffmpeg:6.1-alpine",
      "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", `/work/${file}`,
    ]);
    const s = Number(String(stdout).trim());
    return Number.isFinite(s) && s > 0 ? Math.round(s * 10) / 10 : null;
  } catch {
    return null; // a missing docker/ffprobe must not fail a generation or an upload
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Probe and persist `asset.duration_s`; safe to call repeatedly. */
export async function recordAssetDuration(db: Db, assetId: string, bytes: Uint8Array, ext = "mp3"): Promise<number | null> {
  const s = await probeDurationS(bytes, ext);
  if (s !== null) await db.update(asset).set({ durationS: String(s) }).where(eq(asset.id, assetId));
  return s;
}
