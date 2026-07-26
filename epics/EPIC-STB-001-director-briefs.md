# EPIC-STB-001 — Director briefs: free-form style intent compiled into directable craft

- **Status:** IN_PROGRESS — lower loop complete (5/5 tasks `LOWER_VERIFIED`), upper loop not started
- **Owning context(s):** STB (story & storyboard) · GEN (prompt assembly, research) · PRJ (project style state)
- **Created:** 2026-07-26

## Sourced user outcome

> **USER:2026-07-26:** "Can we further improve the artistic director skills of our video scripting,
> how could we make the videos even more stand out and how could we support different styles, e.g.
> animations or even explainer videos etc."
>
> **USER:2026-07-26:** "Director's pass would be quite cool, but also looking for even further
> styling options. Like saying I want a 1-minute feature film of ModernPath AI directed by Aki
> Kaurismäki, a bit humoristic."

A user states creative intent in their own words — a reference director, a genre, a tone — and the
system turns it into a video that visibly obeys that intent, including what the style *refuses* to
do. Today intent can only be chosen from six hardcoded archetypes
(`CODE:libs/shared/src/config/archetypes.ts`), and craft direction exists only as English prose
inside prompt strings, so nothing can check whether the plan honoured it.

## Linked user requirements

| UR | Statement | Status |
|---|---|---|
| UR-DIR-001 | As a director-user I can state a film's style in free-form words (reference director, genre, tone) and have the whole pipeline follow it. | PROPOSED |
| UR-DIR-002 | As a director-user I can see and edit what the system understood my style to mean, rather than re-rolling an opaque prompt. | PROPOSED |
| UR-DIR-003 | As a director-user I get craft feedback on a plan before I pay to generate it. | PROPOSED |

## Actors

- **Director-user** — states intent, edits the compiled card, accepts or rejects director's notes.
- **Style compiler** (system) — grounded research → structured Style Card.
- **Director's pass** (system) — grades a draft shot plan against the active card.

## Owning models / events

- `project.archetype` (`CODE:libs/prj/src/schema.ts:13`) — today a `text` key into a hardcoded
  record; becomes a reference to a stored, editable Style Card.
- `ArchetypeRecipe` (`CODE:libs/shared/src/config/archetypes.ts`) — the six current recipes become
  **seed data** in the new card shape, not code.
- Shot plan `direction` (`CODE:libs/gen/src/prompt.ts` `assembleShotPlanPrompt`) — gains typed
  grammar fields alongside today's free-text `camera`.
- Grounded research (`CODE:libs/gen/src/research.ts`) — existing Google Search + URL context call,
  repointed from company profiles to style references.

## Key design decision (sourced)

**A reference name is compiled into craft primitives and never forwarded to the image or video
model.** `DOC:docs/87-directing-playbook.md` establishes that direction lives in prompts; this epic
adds that *named-artist* direction must be resolved to primitives first, because (a) providers
filter or dilute named-artist style prompts, making output inconsistent, and (b) a name averages to
a vague vibe in an image model, whereas "frontal, locked-off, saturated red against olive, no
reaction shots" repeats reliably across every shot of a film. Recorded as the epic's governing
constraint; any scenario that leaks a reference name into a visual prompt fails.

## BDD acceptance scenarios

### SCN-DIR-001 — A free-form brief compiles into an editable Style Card
- **Status:** PROPOSED
- **Given** a project with no archetype selected
- **When** the user enters "1-minute feature film of ModernPath AI directed by Aki Kaurismäki, a bit humoristic"
- **Then** a Style Card is produced with populated structure, camera, shot-size, duration, palette,
  light, performance, humour, sound and typography axes, plus explicit **anti-notes**
- **And** every axis is editable and re-plannable without re-running the compiler
- **Source:** `USER:2026-07-26` (the Kaurismäki brief)

### SCN-DIR-002 — The compiled card never leaks the reference name downstream
- **Status:** PROPOSED
- **Given** a Style Card compiled from a brief naming a real director
- **When** frame and take prompts are assembled for any shot of that project
- **Then** no assembled visual prompt contains the reference name
- **And** the card's craft primitives do appear
- **Source:** epic governing constraint above

### SCN-DIR-003 — A plan is graded against the card before generation is paid for
- **Status:** PROPOSED
- **Given** an active Style Card specifying static camera and long holds
- **When** a draft shot plan contains push-ins and 4s shots
- **Then** the director's pass returns notes naming the offending shots and the axis each violates
- **And** the revised plan honours the card
- **And** no image or video generation has been billed at that point
- **Source:** `USER:2026-07-26` "Director's pass would be quite cool"

### SCN-DIR-004 — Style intent survives into what the viewer actually sees
- **Status:** PROPOSED
- **Given** a project whose card specifies a palette and a typography theme
- **When** the film is planned and its animation shots rendered
- **Then** animation accent/background derive from the card's palette rather than per-shot invented
  hex, and the exported cut reads as one coherent look
- **Source:** `USER:2026-07-26` "make the videos even more stand out"; current per-shot hex is
  `CODE:libs/gen/src/prompt.ts` (`assembleShotPlanPrompt` accent/background guidance)

## System requirements

| SR | Statement | Context | Scenario | Status |
|---|---|---|---|---|
| SR-DIR-001 | A typed shot-grammar vocabulary (shot size, angle, movement) exists in versioned config and is expressible in the shot plan. | STB/shared | SCN-DIR-003 | LOWER_VERIFIED |
| SR-DIR-002 | A grader scores a shot list against grammar rules (contrast cuts, one idea per shot, held ending) and returns structured notes. | STB | SCN-DIR-003 | LOWER_VERIFIED |
| SR-DIR-003 | A Style Card contract defines the style axes including anti-notes, with the six current archetypes expressed as seed cards. | shared | SCN-DIR-001 | LOWER_VERIFIED |
| SR-DIR-004 | A compiler turns a free-form brief into a Style Card using grounded research. | GEN | SCN-DIR-001 | LOWER_VERIFIED |
| SR-DIR-005 | Prompt assembly consumes the card's primitives and provably excludes its reference name from visual prompts. | GEN | SCN-DIR-002 | LOWER_VERIFIED |
| SR-DIR-006 | The director's pass grades a draft plan against the active card and proposes a revision. | GEN/STB | SCN-DIR-003 | LOWER_VERIFIED |
| SR-DIR-007 | Card palette and typography drive animation render props and effects. | STB/ANM | SCN-DIR-004 | PROPOSED |
| SR-DIR-008 | Cards are stored per project, editable, and re-plannable. | PRJ | SCN-DIR-001 | PROPOSED |

## Tasks (first loop)

| TASK | Scope | SR | Status | Lower evidence |
|---|---|---|---|---|
| TASK-DIR-001 | Grammar vocabulary in `@avd/shared/config` + `gradeShotGrammar()` in STB with red-first unit tests | SR-DIR-001, SR-DIR-002 | LOWER_VERIFIED | `libs/stb/tests/grammar.spec.ts` (11) |
| TASK-DIR-002 | Style Card contract + the six archetypes re-expressed as seed cards | SR-DIR-003 | LOWER_VERIFIED | `libs/shared/tests/style-card.spec.ts` (24) |
| TASK-DIR-003 | Brief → card compiler on the grounded-research pattern | SR-DIR-004 | LOWER_VERIFIED | `libs/gen/tests/style-compiler.spec.ts` (25) + 2 live grounded compiles |
| TASK-DIR-004 | Prompt assembly from card primitives + name-exclusion test | SR-DIR-005 | LOWER_VERIFIED | `libs/gen/tests/prompt.spec.ts` REQ-GEN-026 (5) |
| TASK-DIR-005 | Director's pass: grade + revise, surfaced as notes | SR-DIR-006 | LOWER_VERIFIED | `libs/stb/tests/director-pass.spec.ts` (13) |

## Failing-test strategy

- **Lower loop:** `gradeShotGrammar()` unit tests are written red against a hand-built shot list that
  violates each rule (two identical sizes adjacent, a movement on a static-only card, a short final
  shot). Compiler and prompt tests run against a fixture card so they need no live provider; the
  name-exclusion test asserts the reference name is absent from every assembled visual prompt.
- **Upper loop:** a user-flow test drives brief → card → plan → notes on a seeded project, asserting
  the plan changes in the direction the notes demanded, with no `generation` row of kind `frame`,
  `take` or `animation` created (SCN-DIR-003's "not billed" clause).

## Status — 2026-07-26

Lower loop complete: all five tasks `LOWER_VERIFIED`, 73 tests across four packages, `archetypes.ts`
deleted, and the compiler verified against the live grounded API. Ledger rows: REQ-STB-041,
REQ-STB-042, REQ-STB-043, REQ-GEN-025, REQ-GEN-026.

**No scenario is `UPPER_VALIDATED`, and the epic is NOT `DONE`.** Compiled cards are not persisted
(SR-DIR-008 untouched) and nothing is reachable from the UI, so there is no user flow to validate
and no human approval to record. SCN-DIR-002 (name exclusion) is verified at every prompt boundary
by unit test and twice against the live API, but as a lower-loop proof, not as an E2E run.

Remaining for the upper loop: persist cards per project (SR-DIR-008), a brief box + card editor in
the workspace, execute-and-apply the director's revision, and card palette driving animation render
props directly (SR-DIR-007 is closed only at the planning layer).

## Open questions

None blocking. Deferred by choice, with reasons:

- **Explainer family** (narration/TTS, diagram templates, screencast assets) is out of scope here —
  it depends on `GAP-108` (voice-over pipeline, post-MVP) and is a sibling epic, not a style card.
  Recorded so the deferral is explicit per `CLAUDE.md` §1.
- **Motion themes** (theme × animation template) are downstream of SR-DIR-007 and follow once card
  typography/palette land.
- **Transitions and pacing curve** in the exporter are unrelated to style compilation and stay in
  the backlog.
