# V-Model Loop Work-List — AI Video Producer

Live top-level control surface for epic-driven development. Detailed epic contents live in `epics/`. Ledger slices live in `libs/<ctx>/REQUIREMENTS.md`. See `req-driven-dev/V-model-loop.md`.

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
| — | — | — | — | — | — | — | — | — | — | — |

## Work Rows

| Task / slice | Epic | Epic record / task file | User requirement | Acceptance scenario | System requirement | Scope | Status | Lower test evidence | Upper BDD/E2E evidence | Code reference | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — | — | — | — |

## Blocked / Deferred

| Item | Status | Reason | Required decision | Owner |
|---|---|---|---|---|
| — | — | — | — | — |

## Completion Roll-Up Rules

- A task is `LOWER_VERIFIED` when its red-first lower-loop tests pass and code references are linked.
- A system requirement is `LOWER_VERIFIED` when all linked tasks are lower-verified and code/test references are linked.
- An acceptance scenario is `UPPER_VALIDATED` when its red-first BDD/E2E/user-flow evidence passes and code references are linked.
- An epic is `DONE` when all linked scenarios are upper-validated, all linked system requirements are lower-verified, and human approval is recorded.
- A user requirement is `VALIDATED` when all linked epics are done and human approval is recorded.
- A work-list row is `DONE` only when the linked task is `LOWER_VERIFIED`, the linked acceptance scenario is `UPPER_VALIDATED`, no unrecorded gap remains, and the parent epic has human approval before epic-level `DONE`.

Acceptance gates and trace chain: `req-driven-dev/V-model-loop.md` · `CLAUDE.md` §5B.
