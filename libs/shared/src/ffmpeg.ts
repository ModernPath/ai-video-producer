/**
 * REQ-PLT-003 / ADR-014 — the one way this repo invokes ffmpeg.
 *
 * ADR-007 said "the worker container bakes ffmpeg in prod". No code ever did: all nine call sites
 * shelled out to `docker run … jrottenberg/ffmpeg`, which is unavailable inside the deployed
 * container. Because each of those call sites deliberately swallows its error (a missing thumbnail
 * must not fail an upload), the whole media pipeline would have degraded to nothing in production
 * without a single log line.
 *
 * Call sites write their arguments against `/work` — the same shape they always had. In `docker`
 * mode the directory is bind-mounted there; in `native` mode `/work` is rewritten to the real path
 * and the bare binary runs. One path, one substituted stage (CLAUDE.md §1.10).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config/index";

const exec = promisify(execFile);

/** The directory every call site writes its paths against. */
export const WORK = "/work";

export type FfmpegMode = "native" | "docker";
export type FfmpegTool = "ffmpeg" | "ffprobe";

/**
 * The command and argv for one invocation. Pure — this is the artifact the spec asserts on.
 *
 * `split(WORK).join(dir)` rather than a path check on purpose: `/work` also appears *inside*
 * composite arguments (`subtitles=/work/caps.srt:fontsdir=/work/fonts:…`), and those must be
 * rewritten too or libass silently renders nothing.
 */
export function ffmpegArgv(
  tool: FfmpegTool,
  mode: FfmpegMode,
  dir: string,
  args: readonly string[]
): { cmd: string; argv: string[] } {
  if (mode === "native") {
    return { cmd: tool, argv: args.map((a) => a.split(WORK).join(dir)) };
  }
  return {
    cmd: "docker",
    argv: [
      "run", "--rm", "-v", `${dir}:${WORK}`,
      ...(tool === "ffprobe" ? ["--entrypoint", "ffprobe"] : []),
      config.ffmpeg.image,
      ...args,
    ],
  };
}

async function run(tool: FfmpegTool, dir: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  const { cmd, argv } = ffmpegArgv(tool, config.ffmpeg.mode, dir, args);
  const { stdout, stderr } = await exec(cmd, argv, { maxBuffer: 32 * 1024 * 1024 });
  return { stdout: String(stdout), stderr: String(stderr) };
}

/** Run ffmpeg over `dir`; arguments reference files as `/work/<name>`. */
export function runFfmpeg(dir: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  return run("ffmpeg", dir, args);
}

/** Run ffprobe over `dir`; arguments reference files as `/work/<name>`. */
export function runFfprobe(dir: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  return run("ffprobe", dir, args);
}
