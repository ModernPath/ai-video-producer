# V-Model Loop Development Template

This template defines the authoritative work-item and evidence structure for loop-based development on top of the V-model.

The process has two evidence loops coordinated by one development loop:

- **Upper loop:** user requirements, epics, user stories, BDD acceptance scenarios, and end-to-end validation.
- **Lower loop:** system requirements, tasks/slices, interfaces, APIs, UI units, services, and verification evidence.
- **Development loop:** selects the next incomplete work-list item, runs the required upper or lower loop, records evidence, and updates completion status.
- **Development method:** TDD in both loops. Upper-loop BDD/E2E acceptance tests are written before the scenario is complete. Lower-loop unit/component/API/contract/integration tests are written before implementation. Completed items must link to the code and test evidence that prove the claim.

The V-model defines traceability. The loops define how work moves in small verified increments.

## Repository Ownership

Work progress belongs in the main repository being changed, beside the product code and tests. Do not keep a separate local `epic/` or `epics/` folder in this instruction/template repository.

Repo-relative process artifacts:

- `WORKLIST.md` is the main repository's live top-level development control surface.
- `WORKLIST.md` owns top-level progress: cross-epic rollups, active work rows, status summaries, approval summaries, and blocked/deferred items.
- `epics/` in the main repository stores epic records.
- Parent epic records own internal completion for their capability: detailed trace maps, scenario/system-requirement/task status, evidence maps, decisions, gaps, and approval records.
- Epic records may be single files or folders with a main epic file and multiple task files.
- Task files may be handed to subagents for focused lower-loop work; they own task-local execution details only. The main chat keeps oversight by monitoring those files and keeping the task file, parent epic, and `WORKLIST.md` synchronized.

Unless otherwise stated, paths in this process are relative to the main repository.

## Grounded Recording

All recorded facts, decisions, requirements, scenarios, system requirements, tasks, status changes, and completion claims must be grounded in source material.

Accepted source types:

- `USER:<date>:<short-summary>`
- `DOC:<path>#<heading-or-section>`
- `CODE:<path>:<line-or-symbol>`
- `TEST:<path>:<test-name>`
- `RUN:<command-or-report>`
- `EPIC:<path>#<heading>`

Rules:

- No information may be recorded as fact without a source reference.
- Unsourced claims must be recorded as open questions.
- Conflicting sources must be recorded as conflicts until resolved by a sourced decision.
- Decisions must be recorded in the relevant epic record with their source and consequence.
- Completion claims must include code and test or validation evidence.

## Loop Chart

```text
                         UPPER LOOP
        user intent, user-facing behavior, acceptance validation

  +-------------------------------------------------------------------+
  |                                                                   |
  |  USER NEED / INTENDED USE                                         |
  |            |                                                      |
  |            v                                                      |
  |  USER REQUIREMENT (UR)                                            |
  |            |                                                      |
  |            v                                                      |
  |  EPIC  -------------------- owns --------------------+            |
  |    |                                                 |            |
  |    v                                                 v            |
  |  USER STORY / JOURNEY                     BDD ACCEPTANCE SCENARIO |
  |            |                                      |               |
  |            |                                      v               |
  |            |                         E2E / USER-FLOW VALIDATION   |
  |            |                                      |               |
  |            +---------------- validates -----------+               |
  |                                                                   |
  +-------------------------------------------------------------------+
                    |                                ^
                    | decomposes into                | evidence rolls up
                    v                                |
  +-------------------------------------------------------------------+
  |                                                                   |
  |  SYSTEM REQUIREMENT (SR)                                          |
  |            |                                                      |
  |            v                                                      |
  |  TASK / SLICE                                                     |
  |            |                                                      |
  |            v                                                      |
  |  API / UI UNIT / SERVICE / DATA / INTEGRATION CHANGE              |
  |            |                                                      |
  |            v                                                      |
  |  UNIT / COMPONENT / CONTRACT / API / INTEGRATION TEST EVIDENCE    |
  |            |                                                      |
  |            +---------------- verifies ----------------------------+
  |                                                                   |
  +-------------------------------------------------------------------+

                         LOWER LOOP
        system behavior, interfaces, components, verification evidence

Trace chain:

  UR -> EPIC -> SCN -> SR -> TASK -> TEST -> CODE
```

## Development Loop

The development loop coordinates the upper and lower loops. It is driven by the main repository's `WORKLIST.md` for top-level progress and next-work selection.

No implementation work starts outside the work-list. Every active epic, scenario, system requirement, and task must appear in the work-list with trace links and top-level completion status.

Flow:

```text
  +----------------------------------------------------------------+
  | DEVELOPMENT LOOP                                               |
  |                                                                |
  |  1. Select next READY work-list row                            |
  |            |                                                   |
  |            v                                                   |
  |  2. Confirm trace chain: UR -> EPIC -> SCN -> SR -> TASK       |
  |            |                                                   |
  |            v                                                   |
  |  3. Run lower loop if system behavior is incomplete            |
  |            |                                                   |
  |            v                                                   |
  |  4. Record lower-loop evidence and mark task/SR verified       |
  |            |                                                   |
  |            v                                                   |
  |  5. Run upper loop with BDD/E2E acceptance test first          |
  |            |                                                   |
  |            v                                                   |
  |  6. Record upper-loop evidence and mark scenario validated     |
  |            |                                                   |
  |            v                                                   |
  |  7. Request and record human approval for epic / UR completion |
  |            |                                                   |
  |            v                                                   |
  |  8. Roll up completion to epic and user requirement            |
  |            |                                                   |
  |            +------------------ next incomplete row -------------+
  |                                                                |
  +----------------------------------------------------------------+
```

Detailed state flow:

```text
                         WORKLIST.md
              source of truth for top-level progress

                              |
                              v
                   +----------------------+
                   | next READY work row  |
                   +----------------------+
                              |
                              v
               +--------------------------------------+
               | trace complete?                      |
               | UR -> EPIC -> SCN -> SR -> TASK      |
               +--------------------------------------+
                    | yes                  | no
                    v                      v
          +-------------------+     +-------------------+
          | set IN_PROGRESS   |     | BLOCKED / add gap |
          +-------------------+     +-------------------+
                    |
                    v
        +-------------------------------+
        | lower-loop evidence complete? |
        +-------------------------------+
             | no                    | yes
             v                       v
  +------------------------+   +------------------------+
  | run lower loop         |   | mark TASK / SR         |
  | implement slice        |   | LOWER_VERIFIED         |
  | unit/API/UI/contract   |   +------------------------+
  | integration tests      |              |
  +------------------------+              v
                                  +-------------------------------+
                                  | upper-loop evidence complete? |
                                  +-------------------------------+
                                       | no                    | yes
                                       v                       v
                         +---------------------------+   +----------------------+
                         | run upper loop            |   | mark SCN            |
                         | failing BDD/E2E first     |   | UPPER_VALIDATED     |
                         | then user-flow pass       |   +----------------------+
                         +---------------------------+              |
                                                                    v
                                                     +--------------------------+
                                                     | approval required for    |
                                                     | EPIC DONE / UR VALIDATED |
                                                     +--------------------------+
                                                                    |
                                                                    v
                                                     +--------------------------+
                                                     | roll up epic / UR state  |
                                                     | after approval           |
                                                     +--------------------------+
                                                                    |
                                                                    v
                                                     +--------------------------+
                                                     | next incomplete row      |
                                                     +--------------------------+
```

Rules:

- The development loop must start from `WORKLIST.md`.
- A row may enter implementation only when its trace chain is complete or explicitly marked as a technical enabler.
- An epic may enter implementation loops only after it passes the Epic Specification Gate.
- Lower-loop work records task and system-requirement internal completion, test evidence, and code references in the parent epic record and task file if one exists, then updates `WORKLIST.md` with the top-level status and evidence summary.
- Upper-loop work records acceptance-scenario validation, epic progress, evidence, gaps, and approval details in the parent epic record, then updates `WORKLIST.md` with the top-level status and evidence summary.
- Any discovered gap must be added to the work-list as a new row or marked on the blocked row.
- `WORKLIST.md` is the source of truth for top-level progress, queueing, and cross-epic rollup.
- The parent epic record is the source of truth for internal completion and detailed evidence trace for that epic.
- If `WORKLIST.md`, the parent epic, and any task file disagree, reconcile the drift before starting another row or claiming completion.
- Any item marked `LOWER_VERIFIED`, `UPPER_VALIDATED`, `DONE`, or `VALIDATED` must reference the code and test case or validation evidence that verifies the claim.
- `DONE` and `VALIDATED` also require human approval recorded in the parent epic.
- Upper-loop and lower-loop work both follow red-first TDD.

## Work-List

`WORKLIST.md` is the live top-level control artifact for the development loop and belongs in the main repository being changed.

At the top level, it tracks:

- trace links across `UR -> EPIC -> SCN -> SR -> TASK`;
- current completion status;
- lower-loop verification evidence;
- upper-loop validation evidence;
- human approval status for epic and user-requirement completion;
- blocked or deferred gaps.

`WORKLIST.md` is an index, top-level status rollup, and oversight surface. It does not replace epic records. The authoritative internal completion details for user stories, acceptance scenarios, system requirements, tasks, decisions, gaps, approvals, and evidence maps live under the main repository's `epics/`.

Status vocabulary:

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

Completion evidence rule:

- `LOWER_VERIFIED` requires a code reference and lower-loop test reference.
- `UPPER_VALIDATED` requires failing-then-passing BDD/E2E/user-flow evidence and the code under test.
- `DONE` requires both lower-loop and upper-loop evidence references plus human approval.
- `VALIDATED` requires completed epic references plus human approval proving the user requirement is accepted.

Acceptance gates:

| Gate | Required before status | Evidence / approval |
|---|---|---|
| Trace gate | `READY` | UR, EPIC, SCN, SR, TASK links exist or technical-enabler justification is recorded |
| Lower TDD gate | `LOWER_VERIFIED` | failing lower-loop test, passing lower-loop test, code reference |
| Upper TDD gate | `UPPER_VALIDATED` | failing BDD/E2E/user-flow test, passing BDD/E2E/user-flow test, code reference |
| Epic approval gate | `DONE` | all scenarios `UPPER_VALIDATED`, all system requirements `LOWER_VERIFIED`, no unrecorded gaps, human approval recorded |
| User validation gate | `VALIDATED` | all linked epics `DONE`, human approval recorded |

Required work-list sections:

```markdown
# V-Model Loop Work-List

## Epic Rollup

| Epic | Epic record | User requirements | Acceptance scenarios | System requirements | Tasks | Upper status | Lower status | Overall status | Human approval | Evidence / gaps |
|---|---|---|---|---|---|---|---|---|---|---|
| EPIC-<AREA>-NNN | epics/EPIC-<AREA>-NNN-<title>.md or epics/EPIC-<AREA>-NNN-<title>/EPIC.md | UR-<AREA>-NNN | SCN-<AREA>-NNN | SR-<AREA>-NNN | TASK-<AREA>-NNN | PROPOSED | PROPOSED | PROPOSED | - | - |

## Work Rows

| Task / slice | Epic | Epic record / task file | User requirement | Acceptance scenario | System requirement | Scope | Status | Lower test evidence | Upper BDD/E2E evidence | Code reference | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-<AREA>-NNN | EPIC-<AREA>-NNN | epics/EPIC-<AREA>-NNN-<title>.md or epics/EPIC-<AREA>-NNN-<title>/tasks/TASK-<AREA>-NNN.md | UR-<AREA>-NNN | SCN-<AREA>-NNN | SR-<AREA>-NNN | API/UI/service/data/vertical | READY | - | - | - | - |

## Blocked / Deferred

| Item | Status | Reason | Required decision | Owner |
|---|---|---|---|---|
| <id> | BLOCKED | <reason> | <decision needed> | <owner> |
```

Completion roll-up:

- A task is `LOWER_VERIFIED` when its red-first lower-loop tests pass and code references are linked.
- A system requirement is `LOWER_VERIFIED` when all linked tasks are lower-verified and code/test references are linked.
- An acceptance scenario is `UPPER_VALIDATED` when its red-first BDD/E2E/user-flow evidence passes and code references are linked.
- An epic is `DONE` when all linked scenarios are upper-validated, all linked system requirements are lower-verified, and human approval is recorded.
- A user requirement is `VALIDATED` when all linked epics are done and human approval is recorded.

## Epic Storage

Store epics as first-class parent artifacts under the main repository's `epics/`.

Allowed layouts:

```text
epics/
  README.md
  EPIC-<AREA>-NNN-<short-title>.md
```

or:

```text
epics/
  README.md
  EPIC-<AREA>-NNN-<short-title>/
    EPIC.md
    tasks/
      TASK-<AREA>-NNN-<short-title>.md
```

Use the folder layout when the epic has multiple independently executable tasks or when task files are useful for subagent handoff. The main epic file owns the internal trace map and completion rollup for that epic. Task files own focused lower-loop task detail and evidence, but they do not replace the parent epic or `WORKLIST.md`.

Each epic record owns the complete repo-local tree for that capability:

```text
EPIC
  -> MAIN BOUNDED CONTEXT
  -> KEY DOMAIN MODELS
  -> KEY DOMAIN EVENTS
  -> linked USER REQUIREMENTS
  -> USER STORIES / JOURNEYS
  -> BDD ACCEPTANCE SCENARIOS
  -> SYSTEM REQUIREMENTS
  -> TASKS / SLICES
  -> EVIDENCE MAP
  -> BLOCKED / DEFERRED ITEMS
```

Rules:

- Every epic must have exactly one canonical epic record: either a single file in `epics/` or one folder in `epics/` with a main epic file.
- `WORKLIST.md` must link to the canonical epic record. If task files exist, active work rows should also link to the relevant task file.
- The main epic record contains the detailed parent-child trace map.
- The main epic record identifies the main bounded context, key domain models, and key domain events for the capability.
- `WORKLIST.md` contains the top-level cross-epic status rollup, active development rows, and subagent oversight status.
- A task/slice must be listed in its parent epic before it appears as an active work row in `WORKLIST.md` or is handed to a subagent.
- A BDD acceptance scenario must be listed in its parent epic before lower-loop tasks can be marked `LOWER_VERIFIED`.
- Evidence must be linked in the parent epic, summarized in `WORKLIST.md`, and linked from the task file when a task file exists.

Epic record naming:

```text
EPIC-<AREA>-NNN-<kebab-title>.md
```

Example:

```text
epics/EPIC-TML-001-import-first-clip.md
epics/EPIC-TML-001-import-first-clip/EPIC.md
```

## Artifact Hierarchy

Use this hierarchy for all product work:

```text
USER NEED / INTENDED USE
  -> USER REQUIREMENT
     -> EPIC
        -> USER STORY / USER JOURNEY
           -> BDD ACCEPTANCE SCENARIO
              -> SYSTEM REQUIREMENT
                 -> TASK / SLICE
                    -> TEST EVIDENCE
```

Each level must trace upward and downward. No task is valid unless it traces to a system requirement. No system requirement is valid unless it traces to a user requirement or a justified technical enabler. No epic is complete until its BDD acceptance scenarios have failing-then-passing E2E/user-flow evidence, lower-loop tests pass for all linked system requirements, and human approval is recorded.

## Work Items vs Evidence Artifacts

Keep these concepts separate:

| Type | Artifact | Purpose |
|---|---|---|
| Requirement artifact | User requirement | Defines what the user must be able to achieve |
| Work item | Epic | Groups user stories, acceptance scenarios, system requirements, and tasks into one user-visible capability |
| Behavior artifact | BDD acceptance scenario | Defines concrete user-visible behavior that must pass |
| Requirement artifact | System requirement | Defines required system behavior, interface behavior, data behavior, or UI behavior |
| Work item | Task / slice | Implements and verifies one small vertical piece of a system requirement |
| Evidence artifact | Test evidence | Proves that the behavior works at the required level |

BDD acceptance scenarios are not tasks. They are acceptance evidence. Tasks implement the system behavior needed to make the scenarios pass.

## Upper Loop

The upper loop validates that the product satisfies user requirements. Upper-loop validation uses TDD: write the BDD/E2E acceptance test first, see it fail against incomplete behavior, then build enough verified lower-loop slices to make the acceptance test pass.

Flow:

```text
USER REQUIREMENT
  -> EPIC
     -> USER STORY / USER JOURNEY
        -> BDD ACCEPTANCE SCENARIO
           -> E2E VALIDATION EVIDENCE
```

The upper loop answers:

> Does the product behavior satisfy the user requirement in the intended workflow?

Required evidence:

- BDD acceptance scenarios.
- Failing BDD/E2E acceptance-test evidence before the scenario is complete.
- End-to-end test runs.
- User-flow validation results.
- Product/domain review when needed.
- Links from scenarios to system requirements and tasks.
- Code references for the feature path under validation.

TDD sequence:

```text
USER REQUIREMENT / EPIC
  -> write BDD acceptance scenario
     -> automate E2E/user-flow test and observe it fail
        -> implement verified lower-loop slices
           -> run E2E/user-flow test until it passes
              -> link acceptance test and code evidence
                 -> mark SCN UPPER_VALIDATED
```

## Lower Loop

The lower loop verifies that the system pieces satisfy their system requirements. Lower-loop implementation uses TDD.

Flow:

```text
SYSTEM REQUIREMENT
  -> TASK / SLICE
     -> API, UI, service, data, contract, or integration change
        -> UNIT / COMPONENT / CONTRACT / API / INTEGRATION TEST EVIDENCE
```

The lower loop answers:

> Does each system part meet its specified behavior and interface contract?

Required evidence:

- Failing test evidence before implementation.
- Unit tests for isolated rules.
- UI component tests for user-interface units.
- API tests for endpoint behavior.
- Contract tests for interface compatibility.
- Integration tests for cross-component behavior.
- Trace links back to the system requirement and epic acceptance scenario.
- Code references for the implementation under test.

TDD sequence:

```text
SYSTEM REQUIREMENT
  -> write failing unit/component/API/contract/integration test
     -> implement the smallest slice that passes
        -> run lower-loop tests
           -> link test and code evidence
              -> mark TASK / SR LOWER_VERIFIED
```

## User Requirements

A user requirement states what a user must be able to do or experience. It belongs to the upper-left side of the V-model.

Format:

```markdown
## UR-<AREA>-NNN - <short title>

**Statement:** The system shall allow <user/actor> to <goal> so that <reason/outcome>.

**User / actor:** <role>
**Intended use:** <context>
**Source:** <customer input, product decision, regulation, workflow, etc.>
**Linked epics:** EPIC-<AREA>-NNN
**Validation method:** BDD E2E scenario / manual validation / product review
**Status:** PROPOSED | READY | IN_PROGRESS | VALIDATED | BLOCKED | DEFERRED
```

Rules:

- A user requirement must describe user value, not implementation.
- A user requirement must link to at least one epic before implementation starts.
- A user requirement is validated only by upper-loop evidence and human approval after linked epics are done.

## Epics

An epic is the primary user-visible work item. It groups the stories, BDD acceptance scenarios, system requirements, and tasks needed to deliver one coherent capability.

Each epic must also identify its DDD ownership:

- **Main bounded context:** the primary domain boundary responsible for the capability.
- **Supporting bounded contexts:** other contexts touched by the capability.
- **Key domain models:** aggregates, entities, value objects, read models, or external models used by the epic.
- **Key domain events:** events emitted, consumed, or observed by the epic.

Format:

```markdown
# EPIC-<AREA>-NNN - <capability name>

## User outcome
<What the user can do when this epic is complete.>

## Linked user requirements
- UR-<AREA>-NNN - <title>

## Users / actors
- <user role>
- <system actor if applicable>

## Domain ownership
**Main bounded context:** <context name / code>
**Supporting bounded contexts:** <context name / code, if any>

## Key domain models
| Model | Type | Context | Source |
|---|---|---|---|
| <model name> | aggregate/entity/value object/read model/external model | <context> | SRC-<AREA>-NNN |

## Key domain events
| Event | Direction | Producer | Consumer | Source |
|---|---|---|---|---|
| <event name> | emitted/consumed/observed | <producer> | <consumer> | SRC-<AREA>-NNN |

## User stories / journeys
- As a <user>, I want <capability> so that <outcome>.
- As a <user>, I want <failure/edge behavior> so that <outcome>.

## BDD acceptance scenarios
- SCN-<AREA>-NNN - <scenario title>

## System requirements
- SR-<AREA>-NNN - <system behavior>

## Tasks / slices
- TASK-<AREA>-NNN - <slice title>

## Evidence
| Acceptance scenario | System requirements | Tasks / slices | Test evidence | Code reference |
|---|---|---|---|---|
| SCN-<AREA>-NNN | SR-<AREA>-NNN | TASK-<AREA>-NNN | <test/report link> | <code link> |

## Human approval
| Approval id | Approver | Role | Source | Scope | Decision |
|---|---|---|---|---|---|
| APP-<AREA>-NNN | <name> | product/domain/QA/owner | USER:<date>:<summary> | EPIC-<AREA>-NNN | approved/rejected/changes requested |

## Done when
- All linked user requirements are covered by BDD acceptance scenarios.
- All BDD acceptance scenarios have failing-then-passing E2E/user-flow evidence.
- All linked system requirements are `LOWER_VERIFIED`.
- All linked tasks are `LOWER_VERIFIED`.
- Evidence links are complete from epic to scenario to system requirement to task to test and code.
- Human approval is recorded for the epic.
```

Rules:

- An epic must be user-visible or explicitly marked as a technical enabler for a user-visible epic.
- An epic must link to at least one user requirement.
- An epic must identify its main bounded context.
- An epic must list key domain models and events, or explicitly state that none are known yet and record an open question.
- An epic must contain BDD acceptance scenarios before lower-loop tasks are considered complete.
- An epic is complete only when upper-loop validation and lower-loop verification both pass and human approval is recorded.

## Epic Specification Gate

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
12. `WORKLIST.md` has an Epic Rollup row and active Work Rows for the first implementation loop.
13. No blocking open question prevents the first implementation loop from starting.
14. Deferred gaps have a reason, owner, and trace to the affected epic/scenario/system requirement/task.

If any gate item fails, the epic remains `PROPOSED` or `BLOCKED`; do not start implementation loops.

When all gate items pass, end the interview or epic creation flow by outputting an implementation kickoff prompt. The prompt must identify the main repository, epic record, active `WORKLIST.md` rows, task files eligible for subagent handoff, required upper-loop and lower-loop TDD sequence, and evidence/status synchronization rules.

## BDD Acceptance Scenarios

BDD acceptance scenarios define the concrete behavior that proves a user story or epic works.

They are written in Gherkin:

```gherkin
Feature: <epic capability>

  Scenario: <observable behavior>
    Given <initial state>
    When <user or system action>
    Then <observable result>
    And <additional observable result>
```

Example:

```gherkin
Feature: Import media onto the timeline

  Scenario: Place an uploaded clip at the playhead
    Given a project is open and a video asset finished processing
    When the editor inserts the asset at the playhead
    Then a clip appears on the timeline at the playhead time
    And the preview shows the first frame of the clip

  Scenario: Reject insert when asset is still processing
    Given a project is open and a video asset is still processing
    When the editor attempts to insert the asset
    Then the insert is rejected
    And the editor sees that processing must complete first
```

Rules:

- A scenario must describe observable behavior, not implementation steps.
- A scenario must link to an epic.
- A scenario must link to the system requirements and tasks that make it pass.
- A scenario must follow TDD: failing BDD/E2E test first, then implementation through lower-loop slices, then passing BDD/E2E evidence.
- A scenario passes only through upper-loop evidence: a passing E2E test, user-flow test, or recorded validation run.

## System Requirements

A system requirement defines the lower-level behavior needed to satisfy a user requirement and epic scenario. It belongs to the lower-left side of the V-model.

Format:

```markdown
## SR-<AREA>-NNN - <short title>

**Statement:** The system shall <required behavior>.

**Source:** UR-<AREA>-NNN / EPIC-<AREA>-NNN / SCN-<AREA>-NNN
**Interface / component:** API | UI | service | data | integration | domain
**Verification method:** unit | component | API | contract | integration | E2E support
**Linked tasks:** TASK-<AREA>-NNN
**Test evidence:** <test file / test case / report>
**Code reference:** <implementation file / symbol>
**Status:** PROPOSED | READY | IN_PROGRESS | LOWER_VERIFIED | BLOCKED | DEFERRED
```

Rules:

- A system requirement must be testable.
- A system requirement must specify the interface, component, or behavior being verified.
- A system requirement must link upward to a user requirement, epic, or acceptance scenario.
- A system requirement is verified by lower-loop evidence.
- A system requirement cannot be marked `LOWER_VERIFIED` without code and test references.

## Tasks / Slices

A task is the lower-loop work item. It implements and verifies one small vertical slice of system behavior.

Use `TASK-*` when describing the work-item layer. If an existing repository already uses `REQ-*` rows as implementation work items, treat those rows as task/slice records and add links to the epic, scenario, and system requirement.

Format:

```markdown
## TASK-<AREA>-NNN - <slice title>

**Goal:** <small verified system behavior>
**Linked system requirement:** SR-<AREA>-NNN
**Linked acceptance scenario:** SCN-<AREA>-NNN
**Scope:** API | UI | service | data | integration | vertical
**Failing test first:** <test file / test case / run reference>
**Passing tests:** <test files / test cases / report>
**Code reference:** <implementation files / symbols>
**Status:** PROPOSED | READY | IN_PROGRESS | LOWER_VERIFIED | BLOCKED | DEFERRED
```

Rules:

- A task must be small enough to complete with tests and trace links in one lower-loop cycle.
- A task must link to a system requirement.
- A product-facing task must link to an acceptance scenario.
- A technical-enabler task must link to the epic or system requirement that justifies it.
- A product-facing task must include the UI, API, service, or data work needed to make a visible behavior progress.
- A task must follow TDD: failing test first, then implementation, then passing test evidence.
- A task reaches `LOWER_VERIFIED` only when its lower-loop tests pass and its code and test references are linked.

## Traceability Rules

Use this trace chain:

```text
UR -> EPIC -> SCN -> SR -> TASK -> TEST -> CODE
```

Required links:

- User requirement links to epic.
- Epic links to BDD acceptance scenarios.
- BDD acceptance scenario links to system requirements.
- System requirement links to tasks/slices.
- Task links to tests and code.
- Test names or metadata reference the task or system requirement id.
- Any completed status must include the code and test case or validation evidence that verifies the completion claim.
- `UPPER_VALIDATED` requires a BDD/E2E/user-flow test reference and code reference.
- `LOWER_VERIFIED` requires a lower-loop test reference and code reference.

No silent work is allowed. If a lower-loop task discovers missing user behavior, add or update the epic acceptance scenarios before treating the task as complete.

## Done Criteria

An epic is done only when:

1. Every linked user requirement is covered by at least one BDD acceptance scenario.
2. Every BDD acceptance scenario has failing-then-passing upper-loop evidence.
3. Every linked system requirement has red-first passing lower-loop evidence.
4. Every linked task is `LOWER_VERIFIED`.
5. Traceability is complete from user requirement to tests and code.
6. Known gaps are recorded as blocked, deferred, or new work.
7. Human approval is recorded in the parent epic.

A task is `LOWER_VERIFIED` only when:

1. Its system requirement is clear and linked.
2. A failing lower-loop test was created before implementation.
3. Its implementation is complete.
4. Its unit/component/API/contract/integration tests pass.
5. Tests and code are linked from the task record.

A work-list row is `DONE` only when:

1. The linked task is `LOWER_VERIFIED`.
2. The linked acceptance scenario is `UPPER_VALIDATED`.
3. The epic rollup has no unrecorded gap for that row.
4. Human approval is recorded for the epic before epic-level `DONE`.

An acceptance scenario is `UPPER_VALIDATED` only when:

1. The BDD acceptance scenario is clear and linked to its epic.
2. A failing BDD/E2E/user-flow test was created before the scenario was complete.
3. The scenario passes through E2E/user-flow/validation evidence.
4. The test and code references are linked from the epic and work-list records.

## Example

```text
UR-TML-001
The editor shall place uploaded video on the timeline at the playhead.

EPIC-TML-001
Import and place first clip.

SCN-TML-001
Place an uploaded clip at the playhead.

SR-TML-001
The system shall create a timeline clip referencing a ready media asset at a given timecode.

TASK-TML-001
Implement clip insert API, timeline aggregate, persistence, and tests.
```

Evidence:

| Level | Evidence |
|---|---|
| SCN-TML-001 | E2E editor insert-clip scenario |
| SR-TML-001 | API test, timeline domain unit test, persistence integration test |
| TASK-TML-001 | linked tests and code implementing the slice |

This structure keeps epics and tasks usable as work items while preserving the V-model distinction between user requirements, system requirements, acceptance validation, and lower-level verification.
