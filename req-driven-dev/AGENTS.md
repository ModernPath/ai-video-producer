# Agent Instructions (V-Model Module)

This folder holds the **V-model loop** templates used by the **AI Video Producer** repository. The main repo root has `AGENTS.md`, `CLAUDE.md`, `WORKLIST.md`, and `docs/`.

Follow the V-model loop process in `V-model-loop.md`.

All work-progress artifacts belong in the **repository root** (this project). Treat `WORKLIST.md`, `epics/`, epic files, epic folders, task files, and validation artifacts as paths relative to the repo root — not under `req-driven-dev/`.

Before starting work:

1. Read repository root `AGENTS.md` and `CLAUDE.md`.
2. Read `V-model-loop.md` (this folder).
3. Read repository root `WORKLIST.md`.
4. Read `epics/README.md` if it exists.
5. Read `interview-flows.md` when user interaction, epic creation, or epic review is involved.
6. Open the relevant epic under `epics/` if one exists.

Working rules:

- Start from the main repository's `WORKLIST.md`; do not begin implementation outside the work-list.
- Use `WORKLIST.md` for top-level progress: cross-epic rollup, active work rows, blocked/deferred rows, approval summaries, and evidence summaries.
- Store epic details under the main repository's `epics/`.
- Use the parent epic record for internal completion: detailed trace maps, scenario/system-requirement/task status, evidence maps, decisions, gaps, and approval records.
- Epics may be either a single `EPIC-<AREA>-NNN-<title>.md` file or an `EPIC-<AREA>-NNN-<title>/` folder with a main epic file plus task files.
- Use epic task files for subagent handoff when useful. Task files own task-local execution detail only. The main chat keeps oversight by monitoring task-file progress and keeping the task file, parent epic, and `WORKLIST.md` synchronized.
- Epic creation or review must end with an implementation kickoff prompt when the epic satisfies the Epic Specification Gate. The prompt must start implementation from the next `READY` work-list rows, follow the V-model loops, and delegate independent task files to subagents when useful.
- Record facts, decisions, requirements, scenarios, tasks, and status changes only when they have source references.
- Unsourced claims become open questions.
- Both loops use TDD:
  - upper loop: failing BDD/E2E/user-flow test first;
  - lower loop: failing unit/component/API/contract/integration test first.
- Do not mark anything `LOWER_VERIFIED`, `UPPER_VALIDATED`, `DONE`, or `VALIDATED` without linked code and test/validation evidence.
- Treat passing tests as the validation gate for upper and lower loops: upper-loop statuses require passing BDD/E2E/user-flow evidence, and lower-loop statuses require passing unit/component/API/contract/integration evidence.
- Do not mark an epic `DONE` or a user requirement `VALIDATED` until human approval is recorded in the parent epic.
- After each lower-loop or upper-loop status change, update the parent epic record and task file if one exists, then update `WORKLIST.md` with the top-level rollup.
- If `WORKLIST.md`, the parent epic, and any task file disagree, reconcile the drift before starting the next row or claiming completion.

If the user wants to discuss scope, behavior, decisions, epic creation, or epic review, use the interview flows in `interview-flows.md`.
