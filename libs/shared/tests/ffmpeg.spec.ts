// REQ-PLT-003 — one ffmpeg invocation path, asserted on the argv it BUILDS (CLAUDE.md §1.9, §6B).
//
// Every ffmpeg call site in this repo shells out to `docker run … jrottenberg/ffmpeg`. That works on
// a laptop and cannot work inside the deployed container, which has no docker socket — so exports,
// thumbnails, probes and tail frames would all have failed silently in production (each of those
// call sites swallows its error by design). The fix is a single runner with a native mode; this
// spec is the golden file for the argv it produces in both modes.
import { describe, expect, it } from "vitest";
import { ffmpegArgv, WORK } from "../src/ffmpeg";

const DIR = "/tmp/avd-export-01";

describe("REQ-PLT-003: docker mode mounts the work dir and keeps /work paths", () => {
  it("builds the same docker invocation the call sites used before", () => {
    expect(ffmpegArgv("ffmpeg", "docker", DIR, ["-i", "/work/in.mp4", "-y", "/work/out.mp4"])).toEqual({
      cmd: "docker",
      argv: [
        "run", "--rm", "-v", `${DIR}:/work`,
        "jrottenberg/ffmpeg:6.1-alpine",
        "-i", "/work/in.mp4", "-y", "/work/out.mp4",
      ],
    });
  });

  it("ffprobe overrides the image entrypoint", () => {
    const { argv } = ffmpegArgv("ffprobe", "docker", DIR, ["-show_entries", "format=duration", "/work/media.mp3"]);
    expect(argv.slice(0, 7)).toEqual(["run", "--rm", "-v", `${DIR}:/work`, "--entrypoint", "ffprobe", "jrottenberg/ffmpeg:6.1-alpine"]);
  });
});

describe("REQ-PLT-003: native mode rewrites /work to the real directory", () => {
  it("invokes the bare binary with host paths", () => {
    expect(ffmpegArgv("ffmpeg", "native", DIR, ["-i", "/work/in.mp4", "-y", "/work/out.mp4"])).toEqual({
      cmd: "ffmpeg",
      argv: ["-i", `${DIR}/in.mp4`, "-y", `${DIR}/out.mp4`],
    });
  });

  it("rewrites /work inside composite filter arguments, not just standalone paths", () => {
    // The captions burn passes /work twice inside ONE argument:
    //   subtitles=/work/caps.srt:fontsdir=/work/fonts:force_style='…'
    // A naive `arg === "/work/x"` check would leave these pointing at a directory that does not
    // exist in the container, and libass would render nothing rather than fail loudly.
    const { argv } = ffmpegArgv("ffmpeg", "native", DIR, [
      "-vf", "subtitles=/work/caps.srt:fontsdir=/work/fonts:force_style='FontName=X'",
    ]);
    expect(argv[1]).toBe(`subtitles=${DIR}/caps.srt:fontsdir=${DIR}/fonts:force_style='FontName=X'`);
  });

  it("ffprobe resolves to the ffprobe binary", () => {
    expect(ffmpegArgv("ffprobe", "native", DIR, ["/work/media.mp3"]).cmd).toBe("ffprobe");
  });

  it("leaves non-path arguments untouched", () => {
    const { argv } = ffmpegArgv("ffmpeg", "native", DIR, ["-preset", "veryfast", "-af", "afade=t=out:st=28:d=2"]);
    expect(argv).toEqual(["-preset", "veryfast", "-af", "afade=t=out:st=28:d=2"]);
  });
});

describe("REQ-PLT-003: the mount point is one constant", () => {
  it("exports /work rather than repeating the literal at each call site", () => {
    expect(WORK).toBe("/work");
  });
});
