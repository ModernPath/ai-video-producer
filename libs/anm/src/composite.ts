// REQ-ANM-002: ffmpeg composite — alpha webm overlay onto an h264 take (dockerized, ADR-007).
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export async function compositeOverlay(input: {
  videoBytes: Uint8Array;
  overlayWebmBytes: Uint8Array;
  durationS: number;
}): Promise<{ bytes: Uint8Array; mime: string; durationS: number }> {
  const dir = mkdtempSync(join(tmpdir(), "avd-composite-"));
  try {
    writeFileSync(join(dir, "base.mp4"), input.videoBytes);
    writeFileSync(join(dir, "overlay.webm"), input.overlayWebmBytes);
    await exec("docker", [
      "run", "--rm", "-v", `${dir}:/work`, "jrottenberg/ffmpeg:6.1-alpine",
      "-i", "/work/base.mp4",
      "-c:v", "libvpx", "-i", "/work/overlay.webm", // libvpx decoder preserves VP8 alpha
      "-filter_complex", "[1:v]scale2ref=w=iw:h=ih[ov][base];[base][ov]overlay=0:0:shortest=1[v]",
      "-map", "[v]", "-map", "0:a?",
      "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      "-c:a", "copy", "-movflags", "+faststart", "-y", "/work/out.mp4",
    ]);
    return { bytes: new Uint8Array(readFileSync(join(dir, "out.mp4"))), mime: "video/mp4", durationS: input.durationS };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
