import { describe, expect, it } from "vitest";
import { extractTailFrame } from "../src/tail-frame";

// USER 2026-07-27: "the clothing and positions of persons sitting are changing… store the last
// frame of video as reference starting image for next clip?"
//
// The pipeline can already condition a take on a START frame; what it could not do is produce one
// from the END of the previous take. That is the missing link in a continuous action: shot B does
// not need a description of where shot A left the actor, it needs the actual frame.
const RUN = process.env.RUN_FFMPEG !== "0";

describe.skipIf(!RUN)("REQ-AST-013: the last frame of a take becomes an image", () => {
  // A tiny synthetic clip whose final frame differs from its first, so "last" is provable.
  const makeClip = async (): Promise<Uint8Array> => {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const { mkdtemp, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const exec = promisify(execFile);
    const dir = await mkdtemp(join(tmpdir(), "avd-tail-"));
    await exec("docker", [
      "run", "--rm", "-v", `${dir}:/work`, "jrottenberg/ffmpeg:6.1-alpine",
      "-f", "lavfi", "-i", "color=c=black:s=64x64:d=1",
      "-f", "lavfi", "-i", "color=c=red:s=64x64:d=1",
      "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]", "-map", "[v]",
      "-pix_fmt", "yuv420p", "-y", "/work/clip.mp4",
    ]);
    return new Uint8Array(await readFile(join(dir, "clip.mp4")));
  };

  it("returns a JPEG, not the source video", async () => {
    const out = await extractTailFrame(await makeClip());
    expect(out).not.toBeNull();
    expect(out!.byteLength).toBeGreaterThan(0);
    expect(out![0]).toBe(0xff); // JPEG SOI
    expect(out![1]).toBe(0xd8);
  }, 120_000);

  it("takes the END of the clip, not the beginning — the whole point", async () => {
    const out = await extractTailFrame(await makeClip());
    // The clip is black then red; a frame from the tail must be predominantly red.
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const exec = promisify(execFile);
    const dir = await mkdtemp(join(tmpdir(), "avd-tailcheck-"));
    await writeFile(join(dir, "f.jpg"), out!);
    const { stdout } = await exec("docker", [
      "run", "--rm", "-v", `${dir}:/work`, "--entrypoint", "ffprobe", "jrottenberg/ffmpeg:6.1-alpine",
      "-v", "error", "-show_entries", "frame_tags=lavfi.signalstats.YAVG",
      "-f", "lavfi", "-i", "movie=/work/f.jpg,signalstats", "-of", "csv=p=0",
    ]).catch(() => ({ stdout: "" }));
    // Red is far brighter than pure black; any non-trivial luma proves it is not the first frame.
    expect(Number(stdout.trim().split(",").pop() ?? 0)).toBeGreaterThan(20);
  }, 120_000);

  it("returns null for bytes that are not a video, rather than throwing", async () => {
    expect(await extractTailFrame(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  }, 120_000);
});
