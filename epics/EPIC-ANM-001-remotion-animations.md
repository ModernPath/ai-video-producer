# EPIC-ANM-001 — Remotion animations: free takes + overlays on generated shots

- **Status:** DONE — retroactive backfill 2026-07-27
- **Owning context(s):** ANM · GEN · STB · ASM (composite)
- **Build phase:** shipped MVP 2026-07-23 (user epic)

## Sourced user outcome

> **USER:2026-07-23 (BACKLOG):** Remotion epic — (1) pure-animation scenes from a prompt rendered
> via @remotion/renderer into normal shot takes; (2) animation overlays on generated video shots
> (layers/transparency/greenscreen).

Templates are parameterized React components — props, never executable code.

## Linked user requirements

| UR | Statement | Status |
|---|---|---|
| UR-ANM-001 | As a director I can add free motion-graphics takes without spending on frames or video. | VALIDATED |
| UR-ANM-002 | As a director I can composite text overlays onto an existing take without destroying it. | VALIDATED |

## BDD acceptance scenarios

| SCN | Statement | Upper status | Evidence |
|---|---|---|---|
| SCN-ANM-001 | Per-shot "✦ Animate" renders a title-card take at shot duration/AR; selectable and exportable. | UPPER_VALIDATED | `libs/anm/tests/render.int.spec.ts` REQ-ANM-001 + browser |
| SCN-ANM-002 | Overlay composites transparent lower-third into a new take with `retake_of` lineage. | UPPER_VALIDATED | `libs/anm/tests/render.int.spec.ts` + `libs/stb/tests/overlay.int.spec.ts` REQ-ANM-002 |
| SCN-ANM-003 | Plan can author animation shots (no frame spend) applied on shot-plan apply. | UPPER_VALIDATED | `tests/plan-normalize.spec.ts` + real E2E REQ-STB-024 |

See `docs/features/animations.md`.

## Ledger trace

| Context | REQ ids |
|---|---|
| ANM | REQ-ANM-001, REQ-ANM-002, REQ-ANM-004 |
| STB | REQ-STB-024 |
| GEN | animation executor branch |

## Deferred (explicit)

| Item | Reason |
|---|---|
| REQ-ANM-005 Plan-driven animation palette | IN_REVIEW — downstream of Style Card (EPIC-STB-001 SR-DIR-007) |
| REQ-ANM-006 Template variety (stat, quote, checklist) | IN_REVIEW — REQ-STB-036 related |
| REQ-ANM-003 full animated lyric overlays | IN_REVIEW — partial ship with ASM captions |

## Human approval

- **USER:2026-07-27:** Retroactive epic backfill — Remotion title + overlay chain shipped with render tests and browser ✦ buttons.
