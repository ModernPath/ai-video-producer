# Interview Flows

These interview flows drive user interaction for the V-model loop process. They define how an agent gathers grounded information, creates or reviews epics, records decisions, and moves work through evidence gates.

The agent must first establish current status and what the user wants to discuss. Then it may dive into an epic, topic, decision, scenario, system requirement, task, or evidence gap.

All recorded information must be grounded. No fact, decision, requirement, scenario, or status claim may be recorded without a source reference.

Use these flows together. Epic creation is an orchestration flow that calls topic, decision, BDD scenario, system requirement, task, gap, and review flows until the epic is ready for implementation loops.

All work-progress artifacts belong in the main repository being changed. Treat `WORKLIST.md`, `epics/`, epic files, epic folders, task files, and validation artifacts as main-repository paths. Do not create or maintain a separate local `epic/` or `epics/` folder in this instruction/template repository.

Progress ownership:

- `WORKLIST.md` owns top-level progress: cross-epic rollup, active work rows, blocked/deferred rows, approval summaries, and evidence summaries.
- Parent epic records own internal completion for their capability: detailed trace maps, scenario/system-requirement/task status, evidence maps, decisions, gaps, and approval records.
- Task files, when present, own task-local execution detail only.
- After each lower-loop or upper-loop status change, update the parent epic record and task file if one exists, then update `WORKLIST.md` with the top-level rollup.
- If `WORKLIST.md`, the parent epic, and any task file disagree, reconcile the drift before starting the next row or claiming completion.

## Grounding Rules

Every recorded fact or decision must cite one or more sources.

Accepted source types:

| Source type | Format | Use |
|---|---|---|
| User statement | `USER:<date>:<short-summary>` | User-provided facts, goals, decisions, priorities |
| Document | `DOC:<path>#<heading-or-section>` | Product docs, external docs, requirements, design notes |
| Code | `CODE:<path>:<line-or-symbol>` | Existing implementation behavior |
| Test | `TEST:<path>:<test-name>` | Existing or new verification evidence |
| Run artifact | `RUN:<command-or-report>` | Test run, validation run, generated report |
| Epic | `EPIC:<path>#<heading>` | Existing epic-local source material |

Rules:

- If a statement has no source, record it as an open question, not as a fact.
- If a source conflicts with another source, record the conflict and ask for resolution.
- If the user makes a decision, record it as a decision with `USER:<date>:...` as the source.
- If code behavior is cited, include the file and line/symbol.
- If completion is claimed, include the code reference and the test or validation evidence.
- Do not silently promote assumptions into requirements.

## Required Epic Sections

Every main epic record in the main repository's `epics/` must include these source-backed sections:

```markdown
## Source material
| Source id | Type | Reference | Notes |
|---|---|---|---|
| SRC-<AREA>-NNN | USER/DOC/CODE/TEST/RUN/EPIC | <reference> | <why it matters> |

## Grounded facts
| Fact id | Fact | Source |
|---|---|---|
| FACT-<AREA>-NNN | <fact> | SRC-<AREA>-NNN |

## Decisions
| Decision id | Decision | Source | Consequence |
|---|---|---|---|
| DEC-<AREA>-NNN | <decision> | SRC-<AREA>-NNN | <impact on epic/scenario/task> |

## Open questions
| Question id | Question | Source / trigger | Needed to proceed |
|---|---|---|---|
| OQ-<AREA>-NNN | <question> | SRC-<AREA>-NNN | yes/no |

## Human approval
| Approval id | Approver | Role | Source | Scope | Decision |
|---|---|---|---|---|---|
| APP-<AREA>-NNN | <name> | product/domain/QA/owner | USER:<date>:<summary> | EPIC-<AREA>-NNN | approved/rejected/changes requested |
```

## Flow 1: Session Intake

Use this at the start of every working session.

```text
Read:
- V-model-loop.md
- main repository WORKLIST.md
- main repository epics/README.md, if present
- relevant files or folders under the main repository's epics/

First establish status:
1. Summarize active epics from WORKLIST.md.
2. Summarize blocked/deferred items.
3. Summarize rows missing code/test evidence.
4. Summarize epics or user requirements missing human approval for DONE/VALIDATED.
5. Summarize rows that are READY or IN_PROGRESS.

Then ask the user what they want to discuss:
- current status,
- a new epic,
- an existing epic,
- a user requirement,
- a BDD acceptance scenario,
- a system requirement or task/slice,
- a decision,
- a gap/blocker,
- code/test evidence.

Do not start changing requirements until the discussion target is clear.
```

Output format:

```markdown
## Current status
- Active epics:
- Blocked/deferred:
- Evidence gaps:
- Approval gaps:
- Next READY rows:

## Discussion target
Ask: What do you want to focus on now?
```

## Flow 2: Epic Creation Orchestration

Use this when the user wants to create a new epic or turn a topic into implementation-ready work.

```text
1. Run Flow 1: Session Intake.
2. Confirm the topic does not already belong to an existing epic.
3. Create a new epic record only when there is a sourced user outcome or sourced user requirement.
4. Run Flow 3: Topic or Epic Interview to define the outcome, users, domain context, models, events, facts, decisions, and open questions.
5. Run Flow 4: Decision Capture for any scope, priority, behavior, or acceptance decision.
6. Run Flow 5: BDD Acceptance Scenario Interview for each user-visible behavior needed to prove the epic.
7. Run Flow 6: System Requirement and Task Interview for the system behavior needed by each acceptance scenario.
8. Run Flow 9: Gap or Conflict Handling for missing sources, unresolved conflicts, or unknown implementation blockers.
9. Run Flow 8: Epic Review before marking the epic READY for implementation loops.
10. Update WORKLIST.md only after the epic satisfies the Epic Specification Gate.
11. When the Epic Specification Gate passes, end by outputting the Flow 11 implementation kickoff prompt.
```

Epic Specification Gate:

An epic is properly specced and implementation loops may start only when:

1. The epic record exists under the main repository's `epics/` as either a single epic file or an epic folder with a main epic file, and it uses the required epic template.
2. The epic has a sourced user outcome and at least one linked user requirement.
3. Users or actors are recorded.
4. Main bounded context is identified, or a blocking open question records why it cannot be identified yet.
5. Supporting bounded contexts, key domain models, and key domain events are recorded with sources, or explicitly recorded as unknown open questions.
6. At least one user story or journey traces to a linked user requirement.
7. BDD acceptance scenarios cover the initial intended workflow needed for implementation to begin.
8. Each BDD scenario has sourced Given/When/Then claims or open questions for missing sources.
9. System requirements exist for the behavior needed by the first implementation loop.
10. Tasks/slices exist for the first lower-loop work and trace to system requirements and acceptance scenarios.
11. The initial failing-test strategy is recorded for upper-loop and lower-loop work.
12. WORKLIST.md has an Epic Rollup row and active Work Rows for the first implementation loop.
13. No blocking open question prevents the first implementation loop from starting.
14. Deferred gaps have a reason, owner, and trace to the affected epic/scenario/system requirement/task.

If any gate item fails, the epic remains `PROPOSED` or `BLOCKED`; do not start implementation loops.

## Flow 3: Topic or Epic Interview

Use this when the user wants to discuss a topic, new epic, or existing epic.

```text
1. Identify whether the topic maps to an existing epic.
2. If it maps to an existing epic, open that epic record.
3. If it does not, propose a new EPIC-<AREA>-NNN file or folder under the main repository's epics/.
4. Ask for the user outcome, affected users/actors, and intended workflow.
5. Identify the main bounded context, supporting bounded contexts, key domain models, and key domain events.
6. Separate facts, decisions, assumptions, and open questions.
7. For each fact or decision, identify the source.
8. Record sourced facts and decisions in the epic record.
9. Record unsourced or ambiguous claims as open questions.
10. Update WORKLIST.md only after the epic trace links are clear.
```

Required interview questions:

```text
What user outcome are we discussing?
Which user or actor is affected?
Is this a new epic or part of an existing epic?
What is the main bounded context for this capability?
Which supporting bounded contexts does it touch?
What domain models are involved?
What domain events are emitted, consumed, or observed?
What source supports this? User statement, document, code, or test?
What decisions have already been made?
What is still unknown?
What would prove this works from the user's point of view?
```

Recording rules:

- User goals become user requirements only when sourced.
- Main bounded context, domain models, and domain events must be sourced or recorded as open questions.
- User journeys become stories only when tied to a user requirement.
- BDD acceptance scenarios must be grounded in a story, user requirement, or decision.
- System requirements must trace to an acceptance scenario or justified technical enabler.
- Tasks/slices must trace to a system requirement.

## Flow 4: Decision Capture

Use this when the user decides scope, behavior, priority, design, or acceptance criteria.

```text
1. Restate the decision in one sentence.
2. Ask for confirmation if the decision changes behavior, scope, or completion criteria.
3. Record the decision in the relevant epic under Decisions.
4. Link the decision to affected user requirements, scenarios, system requirements, and tasks.
5. Update WORKLIST.md if the decision changes status, scope, or priority.
```

Decision entry format:

```markdown
| Decision id | Decision | Source | Consequence |
|---|---|---|---|
| DEC-<AREA>-NNN | <decision> | USER:<date>:<summary> | <affected epic/scenario/task> |
```

Rules:

- Do not record a decision without a source.
- Do not hide disagreement. If a decision conflicts with docs, code, or tests, record the conflict.
- Do not update status to `DONE`, `VALIDATED`, `UPPER_VALIDATED`, or `LOWER_VERIFIED` from a decision alone. Evidence is required.

## Flow 5: BDD Acceptance Scenario Interview

Use this when the discussion is about user-visible behavior.

```text
1. Open the parent epic.
2. Identify the linked user requirement and story.
3. Ask for the observable behavior.
4. Write or update the BDD scenario in Gherkin.
5. Identify the source for every Given/When/Then claim.
6. Mark missing sources as open questions.
7. Add the scenario to the epic's BDD acceptance scenarios table.
8. Add or update WORKLIST.md rows only after the scenario has trace links.
```

Scenario prompt:

```gherkin
Scenario: <observable behavior>
  Given <sourced initial state>
  When <sourced user/system action>
  Then <sourced observable result>
  And <sourced observable result>
```

Rules:

- The scenario must describe behavior, not implementation.
- The upper loop is TDD: create failing BDD/E2E/user-flow evidence before marking the scenario complete.
- `UPPER_VALIDATED` requires failing-then-passing BDD/E2E evidence and code references.

## Flow 6: System Requirement and Task Interview

Use this when the discussion is about APIs, UI units, services, data behavior, integrations, or implementation slices.

```text
1. Open the parent epic.
2. Identify the acceptance scenario that needs the system behavior.
3. Define the system requirement.
4. Define the task/slice that implements the smallest verified increment.
5. Identify code and tests that already exist, if any.
6. Record new facts with sources.
7. Record gaps as open questions or blocked/deferred items.
8. Update WORKLIST.md with the active task row.
9. If the epic uses a folder layout, create or update the task file that a subagent can own, and keep its status and evidence synchronized with the parent epic and WORKLIST.md.
```

Required questions:

```text
Which acceptance scenario does this support?
What system behavior or interface must exist?
Is this API, UI, service, data, integration, domain, or vertical scope?
What test will fail first?
What code path will satisfy the test?
What source supports this behavior?
```

Rules:

- The lower loop is TDD: failing lower-loop test first, then implementation, then passing evidence.
- `LOWER_VERIFIED` requires test references and code references.
- A task/slice cannot be active in WORKLIST.md before it exists in its parent epic.
- Subagent task files are execution records, not independent sources of truth. The main chat remains responsible for rollup status, cross-task conflicts, and final evidence review.

## Flow 7: Evidence and Completion Review

Use this before marking anything complete.

```text
1. Open WORKLIST.md and the parent epic.
2. Check the full trace chain: UR -> EPIC -> SCN -> SR -> TASK -> TEST -> CODE.
3. Verify lower-loop evidence:
   - failing test existed first,
   - passing test exists now,
   - code reference is linked.
4. Verify upper-loop evidence:
   - failing BDD/E2E/user-flow test existed first,
   - passing BDD/E2E/user-flow evidence exists now,
   - code reference is linked.
5. If epic-level DONE or user-requirement VALIDATED is requested, collect human approval:
   - approver name,
   - approver role,
   - approval source,
   - approval scope,
   - decision: approved, rejected, or changes requested.
6. Record approval in the parent epic before changing the rollup status.
7. Update epic-internal completion status in the parent epic before updating the top-level rollup in WORKLIST.md.
8. Update statuses only where evidence and required approval exist.
9. Record any missing proof or approval as an evidence gap in the parent epic, and summarize active gaps in WORKLIST.md.
```

Human approval prompt:

```text
The tests prove the lower and upper loops, but full epic completion requires human approval.
Who is approving this epic or user requirement?
What is their role?
What source records the approval?
Is the approval for EPIC DONE, user requirement VALIDATED, or changes requested?
Are any gaps, exclusions, or follow-up items part of the approval?
```

Completion rules:

- `LOWER_VERIFIED` requires code and lower-loop test evidence.
- `UPPER_VALIDATED` requires code and BDD/E2E/user-flow evidence.
- `DONE` requires both lower-loop and upper-loop evidence plus human approval recorded in the parent epic.
- `VALIDATED` requires completed epic references plus human approval proving the user requirement is accepted.
- No completion status may be set from memory, assumption, or unsourced user expectation.

## Flow 8: Epic Review

Use this to inspect an existing epic and determine what is done, what is ready, and what gaps remain.

```text
1. Open WORKLIST.md and the epic record.
2. Check that the epic satisfies the Epic Specification Gate if implementation has started or is requested.
3. Review linked user requirements:
   - source exists,
   - acceptance scenarios cover the requirement,
   - status matches evidence.
4. Review domain ownership:
   - main bounded context is recorded,
   - supporting bounded contexts are recorded,
   - key models and events are sourced or open questions exist.
5. Review BDD acceptance scenarios:
   - each scenario traces to a story and user requirement,
   - each Given/When/Then claim is sourced or recorded as an open question,
   - failing and passing upper-loop evidence exists for `UPPER_VALIDATED` scenarios.
6. Review system requirements and tasks:
   - each system requirement traces to a scenario or justified technical enabler,
   - each task traces to a system requirement,
   - lower-loop test and code evidence exists for `LOWER_VERIFIED` items.
7. Review human approval:
   - approval exists before epic `DONE`,
   - approval source and scope are recorded,
   - rejected or changes-requested approvals create gaps.
8. Compare the epic record with WORKLIST.md and fix status drift.
9. Record remaining gaps as open questions, blocked/deferred items, or new work-list rows.
10. Report what is complete, what is ready next, what is blocked, and what evidence or approval is missing.
11. If the epic satisfies the Epic Specification Gate and has `READY` implementation rows, output the Flow 11 implementation kickoff prompt.
```

Review output format:

```markdown
## Epic review
- Epic:
- Current rollup status:
- Ready for implementation loops: yes/no
- Done items:
- Ready next:
- Evidence gaps:
- Source gaps:
- Approval gaps:
- Blocked/deferred:
- Required updates:
- Implementation kickoff prompt:
```

Rules:

- Do not treat a checked box or status label as proof. Status must be backed by source, code, test, validation, or approval evidence.
- If WORKLIST.md and the epic disagree, the review must record the mismatch and update the incorrect artifact.
- If an epic is not properly specced, keep it out of implementation loops until the Epic Specification Gate passes.

## Flow 9: Gap or Conflict Handling

Use this when a claim is unclear, unsourced, contradicted, or incomplete.

```text
1. Do not record the claim as fact.
2. Add an open question or blocked/deferred item in the parent epic.
3. Add a row in WORKLIST.md Blocked / Deferred if it affects active work.
4. Include the source or trigger that exposed the gap.
5. Ask the user what source or decision should resolve it.
```

Rules:

- Missing source means open question.
- Conflicting sources mean conflict entry and user decision.
- Missing test/code evidence means evidence gap.
- Deferred work must state reason and owner.

## Flow 10: End-of-Session Summary

Use this before ending a session.

```text
Report:
1. Discussion target.
2. Epic records changed.
3. Facts recorded, with source ids.
4. Decisions recorded, with source ids.
5. Open questions or conflicts created.
6. WORKLIST.md status changes.
7. Evidence gaps.
8. Next recommended discussion target.
```

Do not claim that anything is complete unless the relevant epic and WORKLIST.md rows contain the required source, code, and test references.

## Flow 11: Implementation Kickoff Prompt

Use this at the end of epic creation or epic review when the epic satisfies the Epic Specification Gate and `WORKLIST.md` has active `READY` rows for implementation.

Do not output this prompt for a `PROPOSED` or `BLOCKED` epic. Instead, report the missing gate items and the sources or decisions needed to unblock the epic.

The prompt must be specific enough that a new main chat can start implementation without re-interviewing the user, and constrained enough that subagents only work on their assigned task files.

Prompt format:

```markdown
## Implementation kickoff prompt

Start implementing `<EPIC-ID>` in `<main-repository-path>`.

Read first:
- `V-model-loop.md`
- `WORKLIST.md`
- `<epic-record-path>`
- `<task-file-paths, if any>`

Implementation rules:
- Start from the next `READY` rows in `WORKLIST.md`; do not begin work outside those rows.
- Confirm the trace chain `UR -> EPIC -> SCN -> SR -> TASK` before editing code.
- Run the upper loop first by writing or confirming failing BDD/E2E/user-flow evidence for the acceptance scenario.
- For each task, run the lower loop with failing unit/component/API/contract/integration test first, then implement the smallest slice, then record passing evidence.
- Use subagents for independent task files under `<epic-folder>/tasks/` when the tasks can be verified separately. Give each subagent exactly one task file, its linked system requirement, expected failing test, and evidence update responsibility.
- Keep the main chat responsible for coordination, cross-task conflicts, upper-loop validation, status rollup, and final evidence review.
- After each task, update the task file if one exists, update the parent epic record with internal completion, lower-loop test evidence, and code references, then update `WORKLIST.md` with the top-level rollup status and evidence summary.
- Do not mark `LOWER_VERIFIED`, `UPPER_VALIDATED`, `DONE`, or `VALIDATED` without linked test/validation evidence and code references.
- Do not mark the epic `DONE` or a user requirement `VALIDATED` until human approval is recorded in the parent epic.

Active work rows:
- `<TASK-ID>`: `<WORKLIST row summary and path to task file or epic record>`

Subagent handoff candidates:
- `<TASK-ID>`: `<task file path>`; expected evidence: `<test type / file / command>`

Start by reporting the selected first `READY` row, the failing upper-loop evidence to create or confirm, and the subagents to launch.
```

Rules:

- Preserve concrete IDs, paths, test commands, and source references from the epic and `WORKLIST.md`.
- If there are no independent task files, set `Subagent handoff candidates` to `none` and keep implementation in the main chat.
- If the kickoff prompt would require unsourced behavior, do not output it; record the missing source as an open question or blocker.
