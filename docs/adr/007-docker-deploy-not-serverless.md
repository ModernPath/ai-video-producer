# ADR-007 — Docker deploy over serverless

- **Status:** ACCEPTED · 2026-07-23
- **Context ref:** `docs/03-platform-architecture.md` §Deploy

## Context
Video generation and ffmpeg exports run for minutes and need binaries on disk.

## Decision
Docker on Fly/Railway with ffmpeg baked into the worker image; managed Postgres; R2 for objects.

## Alternatives considered
- **Vercel serverless.** Rejected: execution limits shorter than a single take, and no ffmpeg.
- **Lambda with a container image.** Rejected: cold starts and time limits on a job measured in
  minutes.

## Consequences
- Easy: long jobs, real binaries, predictable cost.
- Hard: dev needs docker for ffmpeg, so ffmpeg-dependent tests are the flakiest under load, and
  need an escape hatch (`RUN_FFMPEG=0`, `DISABLE_THUMBS=1`).
