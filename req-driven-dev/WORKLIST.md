# V-Model Loop Work-List (template copy)

The **live** work-list for AI Video Producer is at the repository root: `/WORKLIST.md`.

This file mirrors the template structure from `V-model-loop.md` for reference when copying to a new repo. Every active user requirement, epic, acceptance scenario, system requirement, and task/slice must be traceable here at rollup level.

Detailed epic contents live in the main repository's `epics/`. Epics may be single files or folders with a main epic file and task files. This file is the cross-epic index, top-level progress rollup, and oversight surface for any task work delegated to subagents. It summarizes epic-internal completion but does not replace the parent epic record.

## Progress Ownership

- `WORKLIST.md` owns top-level progress: Epic Rollup, active Work Rows, blocked/deferred rows, approval summaries, and evidence summaries.
- Parent epic records own internal completion: user stories, acceptance scenarios, system requirements, tasks, decisions, gaps, approvals, detailed evidence maps, and code/test references.
- Task files, when present, own task-local execution detail only.
- After each lower-loop or upper-loop status change, update the parent epic record and task file if one exists, then update `WORKLIST.md` with the top-level rollup.
- If `WORKLIST.md`, the parent epic, and any task file disagree, reconcile the drift before starting the next row or claiming completion.

Both loops use TDD:

- Upper loop: write failing BDD/E2E/user-flow acceptance tests before the scenario is complete.
- Lower loop: write failing unit/component/API/contract/integration tests before implementation.

## Status Vocabulary

| Status | Meaning |
|---|---|
| `PROPOSED` | Identified but not ready for development |
| `READY` | Trace links and acceptance expectations are clear |
| `IN_PROGRESS` | Lower-loop implementation or upper-loop validation is underway |
| `LOWER_VERIFIED` | Red-first lower-loop tests pass for the linked task/system requirement |
| `UPPER_VALIDATED` | Red-first upper-loop BDD/E2E evidence passes for the linked scenario |
| `DONE` | Upper and lower evidence are complete, rolled up, and human-approved |
| `BLOCKED` | Cannot proceed; blocker must be recorded |
| `DEFERRED` | Consciously postponed; reason must be recorded |

## Epic Rollup

| Epic | Epic record | User requirements | Acceptance scenarios | System requirements | Tasks | Upper status | Lower status | Overall status | Human approval | Evidence / gaps |
|---|---|---|---|---|---|---|---|---|---|---|
| - | - | - | - | - | - | - | - | - | - | - |

## Work Rows

| Task / slice | Epic | Epic record / task file | User requirement | Acceptance scenario | System requirement | Scope | Status | Lower test evidence | Upper BDD/E2E evidence | Code reference | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| - | - | - | - | - | - | - | - | - | - | - | - |

## Blocked / Deferred

| Item | Status | Reason | Required decision | Owner |
|---|---|---|---|---|
| - | - | - | - | - |

## Completion Roll-Up Rules

- A task is `LOWER_VERIFIED` when its red-first lower-loop tests pass and code references are linked.
- A system requirement is `LOWER_VERIFIED` when all linked tasks are lower-verified and code/test references are linked.
- An acceptance scenario is `UPPER_VALIDATED` when its red-first BDD/E2E/user-flow evidence passes and code references are linked.
- An epic is `DONE` when all linked scenarios are upper-validated, all linked system requirements are lower-verified, and human approval is recorded.
- A user requirement is `VALIDATED` when all linked epics are done and human approval is recorded.
- A work-list row is `DONE` only when the linked task is `LOWER_VERIFIED`, the linked acceptance scenario is `UPPER_VALIDATED`, no unrecorded gap remains, and the parent epic has human approval before epic-level `DONE`.
