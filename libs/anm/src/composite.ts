// REQ-ANM-002: ffmpeg composite — alpha webm overlay onto an h264 take (ADR-014 runner).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFfmpeg } from "@avd/shared/ffmpeg";

export async function compositeOverlay(input: {
  videoBytes: Uint8Array;
  overlayWebmBytes: Uint8Array;
  durationS: number;
}): Promise<{ bytes: Uint8Array; mime: string; durationS: number }> {
  const dir = mkdtempSync(join(tmpdir(), "avd-composite-"));
  try {
    writeFileSync(join(dir, "base.mp4"), input.videoBytes);
    writeFileSync(join(dir, "overlay.webm"), input.overlayWebmBytes);
    await runFfmpeg(dir, [
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
