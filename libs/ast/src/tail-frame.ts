// REQ-AST-013 (USER 2026-07-27) — the last frame of a take, as an image.
//
// "store the last frame of video as reference starting image for next clip?" The pipeline could
// already condition a take on a START frame (REQ-GEN-009); it could not produce one from the END of
// the previous take. That is the missing link for continuous action: the next shot does not need a
// description of where the actor was left, it needs the actual frame.
//
// ffmpeg via the shared runner, as ASM's export pipeline and AST's derivatives do (ADR-014).
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFfmpeg } from "@avd/shared/ffmpeg";

/**
 * The final frame of a clip as JPEG bytes, or null when the bytes are not a readable video.
 *
 * `-sseof -0.2` seeks relative to the END, which is the whole point — and is far cheaper than
 * decoding the clip to find its duration first. Never throws: a missing tail frame should degrade
 * to "no start frame for the next shot", not fail the take that produced it.
 */
export async function extractTailFrame(videoBytes: Uint8Array): Promise<Uint8Array | null> {
  const dir = await mkdtemp(join(tmpdir(), "avd-tail-"));
  try {
    await writeFile(join(dir, "in.mp4"), videoBytes);
    await runFfmpeg(dir, [
      "-v", "error",
      "-sseof", "-0.2",        // seek from the END of the file
      "-i", "/work/in.mp4",
      "-frames:v", "1", "-q:v", "2", "-y", "/work/tail.jpg",
    ]);
    return new Uint8Array(await readFile(join(dir, "tail.jpg")));
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
