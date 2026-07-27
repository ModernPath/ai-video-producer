# ADR-002 — pg-boss on Postgres for jobs; no separate broker

- **Status:** ACCEPTED · 2026-07-23
- **Context ref:** `docs/03-platform-architecture.md` · reconstructed 2026-07-27

## Context
Generations are long, retryable, and must survive a process restart. A queue is required; an
operational dependency is not obviously required.

## Decision
Run jobs on pg-boss over the existing Postgres. No Redis, no SQS, until scale demands it.

## Alternatives considered
- **Redis/BullMQ.** Rejected: a second datastore to run, back up and reason about, for a workload
  measured in jobs-per-minute.
- **In-process only.** Rejected for production, but retained as the DEV default (`WORKER_MODE`
  unset), which turned out to have a real cost — see Consequences.

## Consequences
- Easy: one datastore; transactional enqueue alongside domain writes.
- Hard: **inline dev mode runs generation inside the HTTP request.** An aborted request (a page
  reload) leaves rows `running` forever. Two takes were stranded 38 minutes this way; recovering
  needed REQ-GEN-027 (sweep on page load). Consider making `WORKER_MODE=queue` the dev default.
