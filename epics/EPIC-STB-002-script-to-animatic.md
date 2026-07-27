# EPIC-STB-002 — Script to animatic: brief → storyboard → watchable preview

- **Status:** DONE — retroactive backfill 2026-07-27
- **Owning context(s):** STB · GEN · ASM (animatic)
- **Build phase:** 2 (`docs/81-build-plan.md`)
- **Supersedes:** EPIC-PRJ-001 (extends single-shot to full board) · **Superseded by:** EPIC-ASM-001 (export at scale)

## Sourced user outcome

> **DOC:docs/81-build-plan.md#1 Phase 2:** Script studio (draft/revise), shot plan propose/apply,
> shot CRUD/reorder, frame candidates + selection, batch generate, animatic — exit demo: brief →
> watchable animatic.

## Linked user requirements

| UR | Statement | Status |
|---|---|---|
| UR-STB-001 | As a director I can go from a brief to a populated storyboard with per-shot scripts. | VALIDATED |
| UR-STB-002 | As a director I can reorder shots and preview pacing before paying for video. | VALIDATED |

## BDD acceptance scenarios

| SCN | Statement | Upper status | Evidence |
|---|---|---|---|
| SCN-STB-001 | Brief → script draft → shot plan applied → storyboard populated. | UPPER_VALIDATED | Script studio browser E2E (BACKLOG iter 7); `tests/script.int.spec.ts` |
| SCN-STB-002 | Script revision re-plan preserves shots with selected takes unless confirmed. | UPPER_VALIDATED | `tests/replan-protect.int.spec.ts` REQ-STB-007 |
| SCN-STB-010 | Reorder persists atomically and animatic order follows. | UPPER_VALIDATED | `tests/reorder.int.spec.ts` + browser E2E REQ-STB-022 |
| SCN-STB-011 | Batch frame generation queues one generation per unframed shot and thumbnails appear via SSE. | UPPER_VALIDATED | `tests/frame-batch.int.spec.ts` + browser E2E REQ-GEN-008 |
| SCN-STB-012 | Animatic plays selected frames for their durations with attached music. | UPPER_VALIDATED | `tests/animatic.spec.ts` + browser E2E REQ-ASM-009 |
| SCN-STB-021 | Retake with instruction creates a new take linked `retake_of`; original preserved. | UPPER_VALIDATED | `tests/retake.int.spec.ts` REQ-STB-020 |

## Ledger trace

| Context | REQ ids (representative) |
|---|---|
| STB | REQ-STB-008, REQ-STB-011 … REQ-STB-022, REQ-STB-013 … REQ-STB-019 |
| GEN | REQ-GEN-008, REQ-GEN-017 |
| ASM | REQ-ASM-009 |

## Human approval

- **USER:2026-07-27:** Retroactive epic backfill — Phase 2 storyboard shipped; script studio and animatic browser-verified.
