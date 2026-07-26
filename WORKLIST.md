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
| EPIC-STB-001 — Director briefs | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-001/002/003 | SCN-DIR-001…004 | SR-DIR-001…008 | TASK-DIR-001…005 | PROPOSED | PROPOSED | PROPOSED | — | Explainer family deferred to a sibling epic (GAP-108 voice-over) |

## Work Rows

| Task / slice | Epic | Epic record / task file | User requirement | Acceptance scenario | System requirement | Scope | Status | Lower test evidence | Upper BDD/E2E evidence | Code reference | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-DIR-001 shot grammar + grader | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-003 | SCN-DIR-003 | SR-DIR-001, SR-DIR-002 | Typed vocabulary in shared config; `gradeShotGrammar()` in STB | READY | — | — | — | The language the compiler and the director's pass both speak — built first |
| TASK-DIR-002 Style Card contract | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-001 | SCN-DIR-001 | SR-DIR-003 | Card shape incl. anti-notes; 6 archetypes as seed cards | PROPOSED | — | — | — | Turns `archetypes.ts` from code into data |
| TASK-DIR-003 brief → card compiler | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-001 | SCN-DIR-001 | SR-DIR-004 | Grounded research → structured card | PROPOSED | — | — | — | Reuses the `research.ts` grounded-search pattern |
| TASK-DIR-004 card-driven prompts | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-001 | SCN-DIR-002 | SR-DIR-005 | Primitives into prompts; reference name provably excluded | PROPOSED | — | — | — | Governing constraint of the epic |
| TASK-DIR-005 director's pass | EPIC-STB-001 | `epics/EPIC-STB-001-director-briefs.md` | UR-DIR-003 | SCN-DIR-003 | SR-DIR-006 | Grade draft plan vs card, propose revision, surface notes | PROPOSED | — | — | — | Must run before any paid generation |

## Blocked / Deferred

| Item | Status | Reason | Required decision | Owner |
|---|---|---|---|---|
| Explainer video family (narration, diagram templates, screencast) | DEFERRED | Voice-led, not music-led: depends on GAP-108 (voice-over pipeline, post-MVP). Sibling epic, not a style card. | Pick a TTS provider before the epic opens | — |
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
