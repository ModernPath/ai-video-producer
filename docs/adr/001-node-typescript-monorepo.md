# ADR-001 — Node/TypeScript monorepo (Next.js + worker), pnpm + Turborepo

- **Status:** ACCEPTED · 2026-07-23
- **Context ref:** `docs/82-tech-stack.md` §1 · reconstructed 2026-07-27 from the tech-stack register

> Reconstructed. The original record was a one-line table entry; context and consequences below are
> inferred from the codebase and marked as such where uncertain.

## Context
A product that generates video needs long-running provider calls, ffmpeg, and a browser UI. Domain
logic has to be shared by both a web app and a background worker without duplication.

## Decision
One pnpm workspace: `apps/web` (Next.js), `apps/worker`, and `libs/<context>` holding the domain.
Both apps import the libs; the libs import nothing from the apps.

## Alternatives considered
- **Two repos (UI and worker).** Rejected: the domain would be duplicated or published as a package,
  and every contract change becomes a release.
- **Single Next.js app, no worker.** Rejected — see ADR-007; video generation exceeds request
  lifetimes.

## Consequences
- Easy: sharing invariants, contracts and config; one `pnpm test` over everything.
- Hard: a heavy dev machine runs Postgres, MinIO, docker-ffmpeg and Next at once. Observed
  2026-07-27: at load average ~100 the integration suite times out and looks like real failures.
- Boundaries must be enforced by discipline, since nothing physically stops a lib importing an app.
