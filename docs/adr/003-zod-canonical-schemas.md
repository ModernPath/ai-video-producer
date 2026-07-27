# ADR-003 — Zod schemas are canonical; OpenAPI generated

- **Status:** ACCEPTED · 2026-07-23
- **Context ref:** `docs/07-api-contracts.md` · `CLAUDE.md` §1.3

## Context
Boundary types exist in three places — DB rows, API payloads, model I/O — and drift between them is
silent until production.

## Decision
Zod schemas are the source of truth at every boundary. Types derive from schemas (`z.infer`), never
the other way round. OpenAPI is generated.

## Alternatives considered
- **TypeScript interfaces + runtime validation elsewhere.** Rejected: types vanish at runtime, so
  malformed model output cannot be caught where it enters.
- **JSON Schema hand-written.** Rejected: two artifacts to keep in step.

## Consequences
- Easy: model output is validated at the boundary; a contract change is a compile error.
  Observed: adding `continuity` to the Style Card broke all six seed cards at compile time — exactly
  the intended behaviour.
- Hard: a schema with `.default()` accepts objects built by hand in tests that production would
  reject. `toVisualStyle` had to guard `?? ""` for cards that never went through the parser.
