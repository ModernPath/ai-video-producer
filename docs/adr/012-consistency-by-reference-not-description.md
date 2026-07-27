# ADR-012 — Consistency comes from reference images, not from prose

- **Status:** ACCEPTED · 2026-07-27
- **Context ref:** REQ-STB-048 · REQ-STB-053 · REQ-STB-054 · `docs/88-architecture-review.md`

## Context
Across a ten-shot film the same character arrived with three different faces and three wardrobes,
the same canteen was re-invented every time, and one shot rendered the lead twice because the second
character existed only as a word.

Prose direction — "the same man in a grey suit" — does not hold identity. Reference images do.

## Decision
Everything that must stay the same across shots is CAST: it becomes an entity with reference images,
attached to the shots it appears in.

- **People and products** → cast entities with portraits (REQ-STB-048).
- **Places** → cast entities of kind `location`, with an empty scene plate (REQ-STB-053).
- **Poses and continuous action** → the previous take’s LAST FRAME, handed to the next shot as its
  start frame (REQ-STB-054); shots so linked form an ordered chain (REQ-STB-055).

Each shot is conditioned only on the cast actually in it — never the whole cast.

## Alternatives considered
- **Describe harder.** Tried first, and it is what the `continuity` axis does. It helps and is not
  sufficient: a description cannot hold a pose or the drape of a coat.
- **One long take instead of chained shots.** Rejected: provider clip limits (4–10s) make it
  impossible for a 60s film.

## Consequences
- Easy: one mechanism — entities with refs — covers faces, brands, rooms. Adding `location` needed a
  migration and a config line; per-shot attachment, casting UI and gap detection came free.
- Hard: **order now matters.** A chained shot generated before its source has no frame to start
  from, so `requestTake` refuses it and the chain is generated head-first.
- Hard: **drift accumulates.** The chain conditions the START of each take; the model still drifts
  within a clip, so three chained 6s shots hold less tightly than one 18s take would.
- Hard: reference plates must be free of anything shot-specific. A portrait carrying the film’s
  typography came back captioned "THE WORKER" in the lead’s wardrobe.
