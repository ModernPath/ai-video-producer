# EPIC-ASM-001 — Export pipeline: selected takes → mixed MP4 → download/share

- **Status:** DONE — retroactive backfill 2026-07-27
- **Owning context(s):** ASM · STB (music brief, take selection)
- **Build phase:** 3 (`docs/81-build-plan.md`)

## Sourced user outcome

> **DOC:docs/81-build-plan.md#1 Phase 3:** Takes at scale (batch, retakes), take selection, snapshot
> → ffmpeg concat → export presets → download; music brief + track attach + mix modes — exit demo:
> full brief → finished 30s video with music.

Assembly is deterministic: concat + mix from immutable, already-rendered takes. Export never
generates.

## Linked user requirements

| UR | Statement | Status |
|---|---|---|
| UR-ASM-001 | As a director I can export a finished video from my selected takes and download it. | VALIDATED |
| UR-ASM-002 | As a director I can choose native / music / mix audio and get an immutable export snapshot. | VALIDATED |

## BDD acceptance scenarios

| SCN | Statement | Upper status | Evidence |
|---|---|---|---|
| SCN-ASM-001 | Export produces downloadable MP4 matching snapshot order and durations. | UPPER_VALIDATED | `tests/export.int.spec.ts` + browser E2E (final.mp4 validated) |
| SCN-ASM-002 | Mix mode `mix` ducks native audio under music per config. | UPPER_VALIDATED | `tests/audio-mix.int.spec.ts` REQ-ASM-004 |
| SCN-ASM-003 | Storyboard edits after export do not alter the produced file (snapshot immutability). | UPPER_VALIDATED | `tests/export.int.spec.ts` INV-ASM-001 |

## Ledger trace

| Context | REQ ids |
|---|---|
| ASM | REQ-ASM-001 … REQ-ASM-008, REQ-ASM-004 … REQ-ASM-006 |
| STB | REQ-STB-010, REQ-STB-020, REQ-STB-021 |

## Follow-on papercuts (not blocking epic closure)

Ledger rows still `IN_REVIEW`: REQ-ASM-012 (aac codec), REQ-ASM-013 (in-app player),
REQ-ASM-014 (clip preview with music bed), REQ-ASM-015 (audio mode picker UX).

## Human approval

- **USER:2026-07-27:** Retroactive epic backfill — golden-thread export and multi-shot concat verified (BACKLOG iter 6).
