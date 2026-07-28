# ADR-014 — One ffmpeg invocation path; the binary lives in the image

- **Status:** ACCEPTED · 2026-07-28
- **Context ref:** ADR-007 · REQ-PLT-003 · `libs/shared/src/ffmpeg.ts`

## Context
ADR-007 chose Docker-over-serverless so long jobs could call real binaries, and stated that "the
worker container bakes ffmpeg in prod". No code ever implemented that half. All nine call sites —
export normalize, concat, music mix, dialogue extract, caption burn, alpha composite, thumbnails,
duration probe, tail frame — each independently shelled out to
`docker run --rm -v ${dir}:/work jrottenberg/ffmpeg:6.1-alpine`.

That works on a laptop with a docker socket. Inside the deployed container there is none. And every
one of those call sites swallows its error by design (a missing thumbnail must not fail an upload,
a missing tail frame must not fail the take that produced it), so the entire media pipeline would
have degraded to "produces nothing" in production without a single log line. This is the exact shape
CLAUDE.md §1.9 warns about: the tests asserted the code existed, never what it produced, and no test
could ever have run in the environment where it was broken.

It is also nine copies of one decision — CLAUDE.md §1.11 — so the container fix would have had to be
applied nine times, correctly, by whoever noticed.

## Decision
One runner, `@avd/shared/ffmpeg`, with two modes selected by `FFMPEG_MODE`:

- `docker` (default, laptops) — bind-mounts the work directory at `/work` and runs the pinned image.
- `native` (the deployed image) — rewrites `/work` to the real path and runs the `ffmpeg`/`ffprobe`
  binaries baked in by the Dockerfile.

Call sites keep writing their arguments against `/work` and know nothing about the mode. The mode is
a substituted STAGE, not a branch at the call site (CLAUDE.md §1.10).

## Alternatives considered
- **Mount `/var/run/docker.sock` into the container.** Rejected on both counts that matter: it hands
  the app root on the host, and it does not even work — `-v ${dir}:/work` is resolved by the *host*
  daemon, and the container's temp directory does not exist there. It would have failed in a way
  that looks like an ffmpeg bug.
- **Sidecar ffmpeg service over HTTP.** Rejected: a network hop, a second deployable and a streaming
  protocol, to replace a process spawn.
- **`FROM jrottenberg/ffmpeg` as the app base image.** Rejected: it pins the Node version to whatever
  that image ships and inverts the dependency — the app is not an ffmpeg distribution.
- **Fix the nine call sites in place, each `if (native)`.** Rejected: that is the nine-copies problem
  again, and the next binary (chromium) would repeat it.

## Consequences
- **Easy:** production actually renders. The argv is a pure function, so both modes are asserted by a
  golden spec (`libs/shared/tests/ffmpeg.spec.ts`) with no ffmpeg installed and no container running.
  A tenth call site gets both modes for free.
- **Hard:** two modes means the mode CI exercises (`docker`) is not the mode production runs
  (`native`). The spec pins the argv of both, but argv equality is not behavioural equality — a
  filter that works in `jrottenberg/ffmpeg:6.1-alpine` and not in Debian's ffmpeg would pass every
  test. The real ring (`pnpm test:real`) and a looked-at export are what close that gap.
- **Hard:** the caption burn now depends on a font present in the image, and libass fails *soft* —
  a missing font renders blank captions, not an error. `CAPTION_FONT_FILE`/`CAPTION_FONT_NAME` are
  config for that reason, and the deployed values point at Liberation Sans.
