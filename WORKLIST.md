# V-Model Loop Work-List — AI Video Producer

Live top-level control surface for epic-driven development. Detailed epic contents live in `epics/`. Ledger slices live in `libs/<ctx>/REQUIREMENTS.md`. Process: `CLAUDE.md` §5B.

## Progress Ownership

- **`WORKLIST.md`** — cross-epic rollup, active rows, blocked/deferred, approval summaries.
- **Parent epic records** — trace maps, scenarios, system requirements, tasks, evidence, approvals.
- **Context ledgers** — `REQ-*` implementation state (`CLAUDE.md`).

Both loops use TDD: upper (BDD/E2E) and lower (unit/component/API/integration).

## Status Vocabulary

| Status | Meaning |
|---|---|
| `PROPOSED` | Identified but not ready for development |
| `READY` | Trace links and acceptance expectations are clear |
| `IN_PROGRESS` | Lower-loop implementation or upper-loop validation is underway |
| `LOWER_VERIFIED` | Red-first lower-loop tests pass for the linked task/system requirement |
| `UPPER_VALIDATED` | Red-first upper-loop BDD/E2E/user-flow evidence passes for the linked scenario |
| `DONE` | Upper and lower evidence are complete, rolled up, and human-approved |
| `VALIDATED` | User requirement: all linked epics `DONE` and human approval recorded |
| `BLOCKED` | Cannot proceed; blocker must be recorded |
| `DEFERRED` | Consciously postponed; reason must be recorded |

Ledger requirements (`libs/<ctx>/REQUIREMENTS.md`) use a **separate** status set — see `CLAUDE.md` §5 (`IN_REVIEW`, etc.).

## Epic Rollup

| Epic | Epic record | User requirements | Acceptance scenarios | System requirements | Tasks | Upper status | Lower status | Overall status | Human approval | Evidence / gaps |
|---|---|---|---|---|---|---|---|---|---|---|
| EPIC-PRJ-001 — Golden thread | `epics/EPIC-PRJ-001-golden-thread.md` | UR-GT-001 | SCN-PRJ-001, SCN-STB-020, SCN-GEN-001 | — (ledger-only) | — | UPPER_VALIDATED | — | DONE | USER:2026-07-27 retroactive backfill | Phase 1 exit demo; browser golden thread BACKLOG iter 4–6 |
| EPIC-STB-002 — Script → animatic | `epics/EPIC-STB-002-script-to-animatic.md` | UR-STB-001/002 | SCN-STB-001/002/010/011/012/021 | — | — | UPPER_VALIDATED | — | DONE | USER:2026-07-27 retroactive backfill | Phase 2; script studio + animatic E2E |
| EPIC-ASM-001 — Export pipeline | `epics/EPIC-ASM-001-export-pipeline.md` | UR-ASM-001/002 | SCN-ASM-001/002/003 | — | — | UPPER_VALIDATED | — | DONE | USER:2026-07-27 retroactive backfill | Phase 3 core; REQ-ASM-012..015 papercuts remain IN_REVIEW in ledger |
| EPIC-GEN-001 — Lyria music | `epics/EPIC-GEN-001-lyria-music.md` | UR-MUS-001/002 | SCN-GEN-010/011/012 | — | — | UPPER_VALIDATED | — | DONE | USER:2026-07-27 retroactive backfill | Real Lyria E2E; REQ-STB-032 BLOCKED on OQ-115 |
| EPIC-ANM-001 — Remotion | `epics/EPIC-ANM-001-remotion-animations.md` | UR-ANM-001/002 | SCN-ANM-001/002/003 | — | — | UPPER_VALIDATED | — | DONE | USER:2026-07-27 retroactive backfill | REQ-ANM-005/006 template variety IN_REVIEW |
| EPIC-STB-003 — Archetype directing | `epics/EPIC-STB-003-archetype-directing.md` | UR-ARC-001/002 | SCN-STB-030/031/032 | — | — | UPPER_VALIDATED | — | DONE | USER:2026-07-27 retroactive backfill | Superseded by EPIC-STB-001 for free-form Style Cards |
| EPIC-STB-001 — Director briefs | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-001/002/003 | SCN-DIR-001…004 | SR-DIR-001…008 | TASK-DIR-001…005 | PROPOSED | LOWER_VERIFIED (5/5 tasks) | IN_PROGRESS | — | **Only active epic.** Upper loop blocked on card persistence (SR-DIR-008) + UI. Supersedes EPIC-STB-003 for style intent. |

## Work Rows

### Active — EPIC-STB-001

| Task / slice | Epic | Epic record / task file | User requirement | Acceptance scenario | System requirement | Scope | Status | Lower test evidence | Upper BDD/E2E evidence | Code reference | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-DIR-001 shot grammar + grader | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-003 | SCN-DIR-003 | SR-DIR-001, SR-DIR-002 | Typed vocabulary in shared config; `gradeShotGrammar()` in STB | LOWER_VERIFIED | `libs/stb/tests/grammar.spec.ts` (11) | — | `libs/shared/src/config/grammar.ts`, `libs/stb/src/grammar.ts` | REQ-STB-041 |
| TASK-DIR-002 Style Card contract | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-001 | SCN-DIR-001 | SR-DIR-003 | Card shape incl. anti-notes; 6 archetypes as seed cards | LOWER_VERIFIED | `libs/shared/tests/style-card.spec.ts` (18) | — | `libs/shared/src/contracts/style-card.ts`, `libs/shared/src/config/style-cards.ts` | REQ-STB-042 · archetypes.ts call sites migrate in TASK-DIR-004 |
| TASK-DIR-003 brief → card compiler | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-001 | SCN-DIR-001 | SR-DIR-004 | Grounded research → structured card | LOWER_VERIFIED | `libs/gen/tests/style-compiler.spec.ts` (25) + 2 live grounded compiles | — | `libs/gen/src/style-compiler.ts` | REQ-GEN-025 · SCN-DIR-002 name-exclusion verified live |
| TASK-DIR-004 card-driven prompts | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-001 | SCN-DIR-002 | SR-DIR-005 | Primitives into prompts; reference name provably excluded | LOWER_VERIFIED | `libs/gen/tests/prompt.spec.ts` REQ-GEN-026 (5) | — | `libs/gen/src/prompt.ts`, stb `recipeFor`, prj `setProjectArchetype`, web picker | REQ-GEN-026 · `archetypes.ts` deleted |
| TASK-DIR-005 director's pass | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-003 | SCN-DIR-003 | SR-DIR-006 | Grade draft plan vs card, propose revision, surface notes | LOWER_VERIFIED | `libs/stb/tests/director-pass.spec.ts` (13) | — | `libs/stb/src/director-pass.ts`, plan-normalize grammar, gen plan schema | REQ-STB-043 · revision not yet executed/applied, notes not in UI → SCN-DIR-003 not upper-validated |

### Forward (not opened)

| Epic (proposed) | Trigger | Status |
|---|---|---|
| EPIC-AST-001 — Library consistency | Phase 4 kickoff; SCN-AST-001…004 | PROPOSED |
| EPIC-STB-004 — Workspace polish | After EPIC-STB-001 upper loop | PROPOSED |
| EPIC-STB-005 — Explainer / voice | GAP-108 TTS provider chosen | DEFERRED |
| EPIC-PLT-001 — Accounts & cost | Phase 5 | PROPOSED |

## Blocked / Deferred

| Item | Status | Reason | Required decision | Owner |
|---|---|---|---|---|
| Explainer video family (narration, diagram templates, screencast) | DEFERRED | Voice-led, not music-led: depends on GAP-108 (voice-over pipeline, post-MVP). Sibling epic EPIC-STB-005, not a style card. | Pick a TTS provider before the epic opens | — |
| Lyric-shot alignment (REQ-STB-032) | BLOCKED | OQ-115 strategy undecided | fill-to-timestamp vs track offset vs both | — |
| Motion themes (theme × animation template) | DEFERRED | Downstream of SR-DIR-007 — needs card typography/palette first | — | — |
| Export transitions + pacing curve | DEFERRED | Unrelated to style compilation; exporter-side work | — | — |

## Completion Roll-Up Rules

- A task is `LOWER_VERIFIED` when its red-first lower-loop tests pass and code references are linked.
- A system requirement is `LOWER_VERIFIED` when all linked tasks are lower-verified and code/test references are linked.
- An acceptance scenario is `UPPER_VALIDATED` when its red-first BDD/E2E/user-flow evidence passes and code references are linked.
- An epic is `DONE` when all linked scenarios are upper-validated, all linked system requirements are lower-verified, and human approval is recorded.
- A user requirement is `VALIDATED` when all linked epics are done and human approval is recorded.
- A work-list row is `DONE` only when the linked task is `LOWER_VERIFIED`, the linked acceptance scenario is `UPPER_VALIDATED`, no unrecorded gap remains, and the parent epic has human approval before epic-level `DONE`.

Acceptance gates and trace chain: `CLAUDE.md` §5B.
