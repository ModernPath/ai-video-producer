# EPIC-PRJ-001 — Golden thread: one shot → frame → take → download

- **Status:** DONE — retroactive backfill 2026-07-27
- **Owning context(s):** PRJ · STB (min) · GEN · AST · ASM
- **Build phase:** 1 (`docs/81-build-plan.md`)
- **Supersedes:** — · **Superseded by:** EPIC-STB-002 (broader storyboard), EPIC-ASM-001 (full export)

## Sourced user outcome

> **DOC:docs/81-build-plan.md#1:** *One shot → start frame → take → download the clip.* Proves
> Gemini image+video APIs, async polling, storage, job queue, cost recording end-to-end.

The magic moment: type a direction, generate a start frame, generate a take, download an MP4 with
audio — before any script studio or multi-shot storyboard UX exists.

## Linked user requirements

| UR | Statement | Status |
|---|---|---|
| UR-GT-001 | As a creator I can produce one finished clip from a single shot direction without leaving the app. | VALIDATED |

## BDD acceptance scenarios

| SCN | Statement | Upper status | Evidence |
|---|---|---|---|
| SCN-PRJ-001 | Create project and land on empty storyboard with "Draft script" call-to-action. | UPPER_VALIDATED | Browser E2E; `docs/features/projects.md` |
| SCN-STB-020 | Direction + frame → take generated → selected; storyboard card flips to `generated`. | UPPER_VALIDATED | `libs/stb/tests/shots.int.spec.ts` golden-thread test + browser (BACKLOG 2026-07-23 iter 4–6) |
| SCN-GEN-001 | Content-policy failure surfaces mapped message and direction edit hint. | UPPER_VALIDATED | `libs/gen/tests/provider-path.int.spec.ts` REQ-GEN-006 |

## Ledger trace

| Context | REQ ids |
|---|---|
| PRJ | REQ-PRJ-001 |
| STB | REQ-STB-001 … REQ-STB-004 |
| GEN | REQ-GEN-001 … REQ-GEN-003, REQ-GEN-007, REQ-GEN-010, REQ-GEN-013, REQ-GEN-015 |
| AST | REQ-AST-001 … REQ-AST-003 |
| ASM | REQ-ASM-001 … REQ-ASM-003 |

## Human approval

- **USER:2026-07-27:** Retroactive epic backfill — golden thread shipped and browser-verified in build iterations 4–6 (BACKLOG routing log).
