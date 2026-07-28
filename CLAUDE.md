# Requirement-Driven Development — Process Manual

Operating manual for building the **AI Video Producer** with full traceability from design docs → requirements → tests → code. Every contributor — human or AI agent — reads it at the start of a session and follows the loop in §6.

This file defines **how** we build. The *what* (domain specs, data models, business rules) lives in `docs/`. Epic-scale work with BDD/E2E evidence also uses **`WORKLIST.md`** and the V-model process in **§5B**.

**This file is the process — there is no second copy.** `AGENTS.md` exists only because other agent tools look for that filename; it is a routing map to the sections below and deliberately restates none of them.

---

## 1. The Non-Negotiables

These govern every change. A change that violates one is wrong even if its tests pass.

1. **Nothing is "done" without all three: requirement, tests, code — cross-linked.** (§8, §9.)
2. **Deferral is explicit, never silent.** Work not done is a `DEFERRED` requirement with reason and tracking link. (§7.)
3. **Contracts are canonical.** Schema definitions (Zod, OpenAPI, etc.) are source of truth; derive boundary types from schemas.
4. **Configuration values are never literals.** Thresholds, rates, model routing from versioned config.
5. **Thin vertical slices, not horizontal layers.** API/event → domain → DB → UI per slice. (`docs/81-build-plan.md`.)
6. **The log tells the truth.** Deferrals, decisions, discoveries in the context `LOG.md` the same session. (§7.)
7. **Discoveries are captured, not carried.** `PROPOSED` ledger row or `/BACKLOG.md` line immediately — never silent merge into current work. (§6A.)
8. **Status is updated in ALL places, atomically.** Ledger: dashboard row, detail block `Status:`, and `Totals:` together. V-model: parent epic, task file (if any), and `WORKLIST.md` together. (§5, §5B.)
9. **Assert the OUTPUT, not the wiring.** For anything that produces an artifact — a prompt, an
   image, a screen — at least one test asserts the artifact itself (golden file, snapshot, rendered
   output). *Added 2026-07-27: every defect of the P8–P9 run shipped green because tests asserted
   that the building code existed and never asserted what it built. See `docs/88-architecture-review.md`.*
10. **One path per pipeline.** No `if (special) return early` that skips shared rails. If a caller
   needs different content, it substitutes a STAGE; it never bypasses the pipeline. *A single early
   return in prompt assembly cost four user-visible defects (REQ-GEN-032).*
11. **Vocabularies are derived, never copied.** One `as const` per list; every consumer imports it.
   *A second copy of the entity kinds silently returned `character` for `location`.*
12. **Expensive-to-reverse decisions get an ADR, when they are made.** Dependencies, boundaries,
   data shapes, pipelines, protocols. `docs/adr/`, immutable, superseded rather than edited. (§4B.)
   *A pipeline decision that lived only as a test assertion was reversed after four defects.*

---

## 2. The Development Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: DISCOVERY                                                          │
│  Customer requirements + tech stack → Design docs                            │
│  Prompt: Prompt 0A (`prompts.md`)                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: PLANNING                                                           │
│  Design docs → Requirements ledgers (+ optional epics / WORKLIST rows)       │
│  Prompt: Prompt 1 · Prompt E (V-model)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: BUILD                                                              │
│  Requirements → Tests → Code                                                 │
│  Prompt: Prompt 2 (repeat) · Prompt 3 (triage between slices)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2B. Phase 1B — Architecture Baseline (before the first slice)

*Added 2026-07-27. The project went from design docs straight to building. Every structural problem
found in `docs/88-architecture-review.md` — the two-path pipeline, two thousand-line modules, an
inverted test pyramid, no render harness — was a decision nobody made deliberately, in a place
nobody had looked, because the work started at "first vertical slice".*

Discovery produces **what**. Phase 1B produces **the shape of the thing that does it**, before code
exists to argue with. Half a day here is worth weeks later; it is also the cheapest work to redo.

**Deliverables — a short doc plus ADRs, not a design phase:**

| # | Deliverable | The question it answers |
|---|---|---|
| 1 | **Context map** | What are the bounded contexts, what may each import, who owns each table? |
| 2 | **Pipeline shapes** | For every transform that produces an artifact — prompt, render, export — what are its STAGES, and where can a caller substitute one? (ADR-010 exists because this was skipped.) |
| 3 | **The seams** | Where will this be split when it grows? Name the modules a context will have at 10× size. Splitting later is easy; discovering the seam inside a 1,100-line file is not. |
| 4 | **Artifact inventory** | What does this system PRODUCE? Each one gets a golden test (§6B) and an owner. Prompts, rendered props, export manifests. |
| 5 | **Test strategy per layer** | Which layer catches what, and what harness each needs. If a layer has no harness on day one it will have no tests on day ninety. |
| 6 | **ADRs for the irreversible** | Dependencies, protocols, persisted shapes, pipeline rules (§4B). |
| 7 | **A vertical spike** | ONE end-to-end path built thin to test the shape — not to ship. If it fights the design, the design is wrong and it is still free to change. |

**Gate — building starts when:** every context has an owner and an import rule · every artifact has a
golden test harness that runs (even with one trivial case) · every pipeline has named stages ·
irreversible choices have ADRs · the spike ran end-to-end.

**A gate is not a phase.** Timebox it. The failure mode on the other side — designing everything up
front — is worse than what it prevents. If a question cannot be answered without building, it is an
OQ and building answers it.

---

**Outer loop (Prompt 3)** replenishes backlog from discoveries and doc changes. **Inner loop (Prompt 2)** builds `READY` requirements. **V-model loop** runs in parallel for epic rows in `WORKLIST.md` when using `epics/`.

---

## 3. Where Everything Lives

```
/AGENTS.md                      ← routing map (filename alias for non-Claude agents)
/CLAUDE.md                      ← this file (the process)
/PROGRESS.md                    ← generated rollup of context ledgers (do not hand-edit)
/BACKLOG.md                     ← triage inbox (§6A)
/prompts.md                     ← copy-paste prompts
/WORKLIST.md                    ← V-model epic/task rollup (§5B)
/docs/                          ← canonical design
   00-overview.md · 01-ubiquitous-language.md · 02-bounded-contexts.md
   06-ux-architecture.md · 07-api-contracts.md · 08-open-questions.md
   10–17 domain docs · 81-build-plan.md · 82-tech-stack.md
   data/40-data-model.md · data/41-event-catalog.md · gap-register.md
   adr/                         ← architecture decision records (§4B)
   88-architecture-review.md    ← latest review (§13)
/epics/                         ← epic records (V-model)
/libs/<ctx>/
   ├── CLAUDE.md               ← context build guide (§10)
   ├── REQUIREMENTS.md         ← requirements ledger (§5)
   ├── LOG.md                  ← build log (§7)
   ├── src/
   └── tests/
/apps/                          ← editor-web, api, workers, …
```

**Two artifacts per context carry process state:**
- **`REQUIREMENTS.md`** — current state: requirements, acceptance criteria, status, code/test links.
- **`LOG.md`** — append-only history and reasoning.

---

## 4. Requirements Derive from the Design Docs

We do not invent requirements. Each traces to canonical design:

- **Invariants & business rules** (`docs/10–17` §3–4) → `REQ-*` with `INV-*` / `BR-*` sources.
- **Commands & events** → behavioral requirements.
- **Read models & APIs** (`docs/07-api-contracts.md`) → endpoint/query requirements.
- **Data model** (`docs/data/40-data-model.md`) → persistence requirements.

Ambiguity → `docs/08-open-questions.md`, requirement `BLOCKED`. True gap → `docs/gap-register.md`.

---

## 4B. Architecture Decisions (`docs/adr/`)

Requirements say *what the product does*. ADRs say **why the code is shaped the way it is** — and
that question outlives every requirement in the ledger.

**Write one when the decision is expensive to reverse:** a dependency, a boundary between contexts,
a persisted data shape, a pipeline, a protocol, or a rule that other code must obey. Not for a
naming choice or a local refactor — those need a comment.

**Rules**

- **Immutable.** Never edit an `ACCEPTED` ADR except to add `Superseded by: ADR-NNN`. Changing your
  mind writes a NEW record; the trail is the value.
- **Alternatives are mandatory.** An ADR with no alternatives considered was not a decision, it was
  a default. Say what lost, and why.
- **Consequences must include the costs.** The "hard" half is what makes the record worth reading in
  two months. An ADR that lists only benefits is marketing.
- **Reference from code:** `// ADR-003` on the line the decision governs, exactly as `INV-*` is used.
- **Reconstructed records say so.** Backfilling is allowed; pretending it was contemporaneous is not.

`docs/adr/README.md` holds the template, the index and the status vocabulary.

**Where ADRs come from:** a design choice made in Phase 1B (§2B); an OQ resolved in a way that
constrains code; a review finding (§13) that changes a rule; or a reversal — reversals are the most
valuable ADRs and the easiest to skip.

---

## 5. The Requirements Ledger (`libs/<ctx>/REQUIREMENTS.md`)

One per bounded context. Opens with a **dashboard table**, then one **detail block** per requirement.

**Requirement ID:** `REQ-<CTX>-NNN` (e.g. `REQ-TML-014`). Stable; never reused.

### Status vocabulary (ledger)

| Status | Meaning |
|---|---|
| `PROPOSED` | Identified from design docs; acceptance criteria not yet written |
| `READY` | Acceptance criteria written and reviewed; ready to build |
| `IN_PROGRESS` | Tests written (red) and/or implementation underway |
| `IN_REVIEW` | Green + traced; awaiting human/domain sign-off |
| `DONE` | Merged; all acceptance criteria pass; traced; logged |
| `DEFERRED` | Consciously not now — **must** carry `reason` + tracking link |
| `BLOCKED` | Cannot proceed — **must** carry the blocking OQ id |
| `OBSOLETE` | Superseded by design change — **must** carry the superseding ref |

**Dashboard (top of file):**

```markdown
## Dashboard — TML (Timeline & Editing)
Totals: 2 DONE · 1 IN_PROGRESS · 1 READY · 3 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-TML-001 | Insert clip at playhead | MVP | DONE | INV-TML-001 | tests/insert-clip.spec.ts | timeline/insert.ts |
| REQ-TML-002 | Reject insert while asset processing | MVP | IN_PROGRESS | INV-MED-002 | tests/insert-clip.spec.ts | timeline/insert.ts |
```

**Detail block (one per requirement):**

```markdown
### REQ-TML-001 — Insert clip at playhead
- **Status:** DONE  ·  **Stage:** MVP  ·  **Priority:** must  ·  **Owner:** —
- **Raised-by:** seeded from `docs/13-timeline-editing.md` (Prompt 1)
- **Source:** INV-TML-001 (`docs/13` §3)
- **Statement:** The editor shall place a ready media asset on the timeline at the playhead as a new clip.
- **Acceptance criteria:**
  - GIVEN a ready asset and an open sequence WHEN InsertClip at playhead THEN a clip exists at that timecode.
  - GIVEN a processing asset WHEN InsertClip THEN rejected per INV-MED-002.
- **Tests:** `tests/insert-clip.spec.ts`
- **Code:** `timeline/insert.ts` (// INV-TML-001)
- **Log:** see LOG entries 2026-07-xx
- **Deferred / notes:** —
```

**Status hygiene (CRITICAL):**

When a requirement's status changes, update **all three** atomically:

1. **Dashboard table row** — `| REQ-… | … | STATUS | …`
2. **Detail block** — `- **Status:** STATUS · …`
3. **Dashboard `Totals:` line** — decrement old count, increment new count

---

## 5B. V-Model process (`WORKLIST.md` / `epics/`) — complete reference

For **epic-scale, user-visible capabilities** that warrant BDD/E2E evidence on top of ledger slices. Two nested TDD loops sharing one trace chain:

```
UR → EPIC → SCN (BDD scenario) → SR (system requirement) → TASK → TEST → CODE
```

- **Upper loop** (user intent): epic owns user stories + BDD acceptance scenarios; each scenario is validated by a red-first E2E/user-flow test.
- **Lower loop** (system behavior): scenarios decompose into system requirements and tasks; each is verified by red-first unit/component/contract/API/integration tests. Evidence rolls back up.
- **Epic record** (`epics/EPIC-<AREA>-NNN-<title>.md`): sourced user outcome · linked URs · actors · owning bounded context(s) · key domain models/events · SCN list · SR list · TASK list — each row with status + evidence links. Rollup rows mirror into `WORKLIST.md`.
- **Grounded recording:** every recorded fact/decision/status carries a source ref — `USER:<date>:<summary>` · `DOC:<path>#<section>` · `CODE:<path>:<line>` · `TEST:<path>:<name>` · `RUN:<command>` · `EPIC:<path>#<heading>`. Unsourced claims become open questions; conflicts stay recorded as conflicts until a sourced decision resolves them; completion claims require code + test/validation evidence.

### Statuses

Used for epics, scenarios, system requirements, and task rows — not for replacing ledger `REQ-*` status unless you explicitly map them.

| Status | Meaning |
|---|---|
| `PROPOSED` | Identified but not ready for development |
| `READY` | Trace links and acceptance expectations are clear |
| `IN_PROGRESS` | Lower-loop implementation or upper-loop validation underway |
| `LOWER_VERIFIED` | Red-first lower-loop tests pass for the linked task/system requirement |
| `UPPER_VALIDATED` | Red-first upper-loop BDD/E2E/user-flow evidence passes for the linked scenario |
| `DONE` | Upper and lower evidence complete, rolled up, and **human-approved** |
| `BLOCKED` | Cannot proceed; blocker recorded |
| `DEFERRED` | Consciously postponed; reason recorded |

**User requirement (UR) rollup:** a user requirement is **`VALIDATED`** when all linked epics are `DONE` and human approval is recorded.

**Acceptance gates (summary):**

| Gate | Before status | Evidence |
|---|---|---|
| Trace gate | `READY` | UR → EPIC → SCN → SR → TASK links (or enabler justification) |
| Lower TDD gate | `LOWER_VERIFIED` | failing then passing lower-loop tests + code ref |
| Upper TDD gate | `UPPER_VALIDATED` | failing then passing BDD/E2E + code ref |
| Epic approval gate | `DONE` | all SCN `UPPER_VALIDATED`, all SR `LOWER_VERIFIED`, human approval |
| User validation gate | `VALIDATED` | all linked epics `DONE`, human approval |

**Epic Specification Gate** — implementation loops may start only when the epic record has: sourced user outcome + ≥1 linked UR · actors · owning context identified (or a blocking OQ) · key models/events sourced or recorded as OQs · ≥1 story tracing to a UR · BDD scenarios covering the initial workflow with sourced Given/When/Then · SRs and TASKs for the first loop, traced · an initial failing-test strategy (both loops) · `WORKLIST.md` rollup + work rows · no blocking OQ · deferred gaps carry reason/owner/trace. Any miss → epic stays `PROPOSED`/`BLOCKED`.

**Operating rules:** the loop starts from `WORKLIST.md`; lower/upper-loop results are recorded in the parent epic AND `WORKLIST.md` (reconcile any drift before the next row); every `LOWER_VERIFIED`/`UPPER_VALIDATED`/`DONE`/`VALIDATED` claim references its code + test/validation evidence; `DONE`/`VALIDATED` additionally require recorded human approval; both loops are red-first TDD.

This §5B is the canonical V-model reference.

---

## 6. The Build Loop (the iterative engine)

```
        ┌─────────────────────────────────────────────────────────────┐
        ▼                                                             │
 0. ORIENT   read REQUIREMENTS dashboard + LOG tail; pick READY      │
             (or promote PROPOSED → READY)                            │
        │                                                             │
 1. SPECIFY  sharpen acceptance criteria vs domain doc; ambiguous?   │
             → OQ + BLOCKED, pick another; else READY → IN_PROGRESS   │
        │                                                             │
 2. RED      acceptance + unit (+ property) tests; tag REQ-<CTX>-NNN; │
             they FAIL                                                │
        │                                                             │
 3. GREEN    smallest change that passes; annotate INV-* in code      │
        │                                                             │
 4. GATE     full test suite green                                    │
        │                                                             │
 4b. LOOK    run it: inspect the produced artifact (prompt/image/     │
             screen) in the product; record what you saw (§9.9)        │
        │                                                             │
 5. TRACE    link code + tests; status → IN_REVIEW (all 3 places)     │
        │                                                             │
 6. REVIEW   human sign-off                                           │
        │                                                             │
 7. COMMIT   PR titled with REQ id                                    │
        │                                                             │
 8. CAPTURE  discoveries → PROPOSED / BACKLOG; LOG entry; → DONE      │
        │                                                             │
        └──────────────► back to 0 ───────────────────────────────────┘
```

**Key rules:** red before green; one requirement at a time (or one thin slice); discoveries don't derail — capture and continue.

**Step 4b is not optional and not a formality.** A green suite means the code you wrote does what you
told it to. It does not mean the product does what the user asked. Look at the thing.

**Red means red for the RIGHT reason.** Before writing the fix, read the failure message and confirm
it fails because the behaviour is missing — not because a fixture, an import or an assertion is
wrong. *This session: a guard test passed against live buggy code because it asserted on its own
fixture; two "red" tests were red because of a bad `base` reference and a self-matching regex.*

When the active unit of work is a **WORKLIST** task row, also run lower/upper loop evidence and update epic + `WORKLIST.md` per §5B.

---

## 6A. Iterative Planning & Emergent Requirements

### Where discoveries come from

Building · code review · integration · user feedback · incidents · **design-doc change**.

### Capture rule

| The discovery is… | Route it to… |
|---|---|
| Clear new requirement, obvious owner | `PROPOSED` in that context's **`REQUIREMENTS.md`** |
| Design ambiguity | **`docs/08-open-questions.md`**; `BLOCKED` placeholder if needed |
| Market/scope gap | **`docs/gap-register.md`**; optional `DEFERRED` requirement |
| Unclear owner / cross-cutting | line in **`/BACKLOG.md`** |
| User-visible capability needing BDD | new or updated **epic** + **`WORKLIST.md`** row |

### Planning loop (Prompt 3)

At session start, when `BACKLOG.md` fills up, after each slice, or when docs change:

1. Sweep **`/BACKLOG.md`**
2. Reconcile **docs ↔ ledgers** (and epics if used)
3. Re-prioritize; promote **`PROPOSED → READY`**
4. Record in affected **`LOG.md`** files; refresh **`PROGRESS.md`**

---

## 6B. What to Test, and Where

Layered by what each layer can actually catch. *Added 2026-07-27 after
`docs/88-architecture-review.md` found 59 integration specs against 25 unit specs and 1 web test,
with every real defect escaping all three.*

| Layer | Tests | Catches | Cost |
|---|---|---|---|
| **Pure** | unit specs on total functions | logic, edge cases, invariants | free, run always |
| **Artifact** | golden files of the produced text/props | rails silently missing, prompt drift, leaked names | free, and the diff IS the review |
| **Render** | component tests on UI panels | stale state, wrong affordances, lying labels | cheap |
| **Integration** | DB/storage/provider boundaries | wiring, contracts, migrations | slow, flaky under load |
| **Real ring** | `pnpm test:real` | provider behaviour and cost | paid, budget-capped (§9.8) |

**Rules of thumb**
- **Prefer pure.** Extract the decision from the plumbing and unit-test the decision. The best code
  in this repo is the pure core (`timeline.ts`, `grammar.ts`, `chain.ts`, `casting.ts`) and none of
  it has needed a bug fix.
- **Every artifact gets a golden file.** `libs/gen/tests/__prompts__/` is the pattern. Update with
  `vitest -u` deliberately and READ the diff — an unexpected line is a bug, not noise.
- **A golden file is a regression detector, not an acceptance test.** `toMatchFileSnapshot` CREATES
  the snapshot when it is missing, so a NEW golden blesses whatever the code currently emits and
  goes green. *Added 2026-07-28: the golden written to prove the script prompt carries the track
  transcript was generated from the broken output — a prompt with no transcript in it — and passed.*
  When you add a golden for a rail that does not exist yet, pin the rail with a real assertion too;
  the golden then guards the wording, and the assertion guards the rail.
- **Integration tests must be scoped.** Never operate on "all rows" — two specs reaped each other's
  fixtures because a sweep was global. If a test needs a global, the CODE probably shouldn't be.
- **Run your own generation, not "the next queued one".** `runGenerationById`, not
  `runNextGeneration`; the latter claims whatever is queued and made both a test and a production
  action non-deterministic.
- **Under load, integration specs flake.** Before believing a red suite, check `uptime` and re-run
  the failing file alone. Report the distinction; never fold a flake into a pass.

---

## 7. The Build Log (`libs/<ctx>/LOG.md`)

Append-only, reverse-chronological. **Ledger = state; log = history.**

```markdown
## 2026-07-14 — REQ-TML-002 reject insert while processing (IN_PROGRESS → DONE)
**Done:** InsertClip rejects non-ready assets; enforced INV-MED-002 at TML boundary.
**Decisions:** Error code `ASSET_NOT_READY` for UI messaging.
**Deferred:** Waveform preview on insert → REQ-TML-015 (DEFERRED, Phase 2).
**Discovered:** Need upload retry UX → REQ-MED-008 (PROPOSED).
**Follow-ups:** none.
**Gate:** all tests green.
```

Every entry: **Done · Decisions · Deferred · Discovered · Follow-ups · Gate result.**

---

## 8. Traceability: code ↔ tests ↔ requirements ↔ rules

- **Tests → requirements:** `describe('REQ-TML-001: insert clip', …)`.
- **Code → rules:** `// INV-TML-001` on enforcing lines.
- **Ledger → code & tests:** each row links files.
- **Commits/PRs → requirements:** `REQ-TML-002: reject insert while asset processing`.
- **Epics → evidence:** SCN/SR/TASK links in epic record and `WORKLIST.md`.

Regenerate **`PROGRESS.md`** from ledgers after merges.

---

## 9. Definition of Done

A ledger requirement is **`DONE`** only when **all** hold:

1. Every acceptance criterion maps to a passing, `REQ`-tagged test.
2. All covered `INV-*` enforced in code and annotated.
3. **`pnpm check` passes — typecheck AND tests, not tests alone.** *Named as a command 2026-07-27
   (REQ-GEN-033): this line used to read "architecture/lint checks pass", which named no command, so
   nothing ran one. `pnpm typecheck` had carried 45 errors across 11 files for weeks — including the
   compiler error for the duplicate `config.project` key that made every threshold read `undefined`.
   A green `pnpm test` says nothing about types; the suite does not typecheck.*
4. Contract tests pass (no schema drift).
5. Human sign-off where business logic requires it.
6. Ledger updated, `LOG.md` entry written, deferrals recorded.
7. **Status in all three ledger places** (§5).
8. **Provider-facing requirements:** the real-API E2E ring passes (`pnpm test:real` — `RUN_REAL_API=1` with `GEMINI_API_KEY` from `.env`) within its per-run budget cap (keep ≈ $0.05/run for images/text; video E2E per approved spike budget).
9. **User-visible requirements: the artifact has been LOOKED AT.** The produced thing — assembled
   prompt, image, take, or screen — has been inspected in the running product and the observation
   recorded in `LOG.md`. Added 2026-07-27 (`docs/88-architecture-review.md` §6): every defect of the
   P8–P9 run shipped with a green suite, because the suite asserted that code existed and never
   asserted what it produced.

Epic / UR completion additionally requires §5B gates and human approval on the parent epic.

---

## 10. Per-Context Build Guide (`libs/<ctx>/CLAUDE.md`) — Template

```markdown
# TML — Timeline & Editing — build guide
- **Design doc:** `docs/13-timeline-editing.md`
- **Aggregates / events / rules:** `docs/02`; rule ids `INV/BR-TML-*`
- **Contracts:** `./contracts/`; DB `docs/data/40`; events `docs/data/41`
- **Requirements:** `./REQUIREMENTS.md`   ·   **Log:** `./LOG.md`
- **Boundary:** import only `shared`; never read another context's tables directly
- **Invariants you must never break:** INV-TML-001 (no illegal overlaps), …
- **Commands to run:** `npm test tml` · `npm run trace`
- **Definition of done:** root `CLAUDE.md` §9
- **Start here:** next `READY` in `REQUIREMENTS.md`; loop §6
```

---

## 10B. Code Shape

*Added 2026-07-27 (`docs/88-architecture-review.md` §3).*

- **~300 lines is the signal.** When a module passes it, look for the seam and split by aggregate.
  A file that can only be edited by careful anchoring is too large — for agents and for humans.
  Current offenders, tracked: `stb/service.ts` (REQ-STB-059), `p/[id]/page.tsx` (REQ-STB-060).
- **Boundary discipline applies WITHIN a context, not only between them.** The lib boundaries here
  held perfectly while one service module grew to 42 exports.
- **A server component loads data and composes.** It does not build panels inline; panels are
  components with explicit props, which is also the only way they become testable.
- **Prefer a named stage over a boolean.** `subjectStage()` beats `if (custom)`; the first is a
  pipeline, the second is a fork that will drift.

---

## 11. Session Ritual

**Start:** §1 + §6; open target `REQUIREMENTS.md` + `LOG.md` tail; if epic work, open `WORKLIST.md` + epic record; planning pass (§6A) if backlog or docs changed.

**End:** tests green; ledger (+ epic/`WORKLIST` if touched) updated; `LOG.md` entry; coherent stopping state.

**Reporting rule.** State what was verified and how. "Tests pass" and "I looked at the output and it
was right" are different claims — make whichever one is true. If a suite is red for environmental
reasons, say so with the evidence (load average, isolation re-run), and never describe a flake as a
pass. If a previously recorded decision is being reversed, say that explicitly and cite what changed
it — see the REQ-GEN-032 reversal of the v3 "guidelines only shape auto prompts" rule.

---

## 12. Quick Reference

| Need | Doc |
|---|---|
| Routing map (non-Claude agents) | `AGENTS.md` |
| Terms | `docs/01-ubiquitous-language.md` |
| Contexts | `docs/02-bounded-contexts.md` |
| Domain | `docs/10–17` |
| UX / features | `docs/06-ux-architecture.md`, `docs/features/` |
| Tables / events | `docs/data/40`, `docs/data/41` |
| API | `docs/07-api-contracts.md` |
| Stack | `docs/82-tech-stack.md` |
| OQs / gaps | `docs/08-open-questions.md`, `docs/gap-register.md` |
| V-model | §5B (this file), `WORKLIST.md`, `epics/` |
| Architecture decisions | `docs/adr/` (§4B) |
| Architecture baseline gate | §2B |
| What to test, where | §6B |
| Review & audit | §13 |
| Latest review | `docs/88-architecture-review.md` |

**The discipline in one sentence:** every change starts as a requirement with acceptance criteria, becomes a failing test, then traced code — and anything we choose not to do is written down as a deferral, not forgotten.

---

## 13. Review & Audit

*Added 2026-07-27. The architecture review that produced `docs/88-architecture-review.md` happened
because the user asked for one. Nothing in the process would have produced it, and it found five
structural defects that had been shipping for weeks.*

Reviews are **triggered by conditions, not by the calendar** — a monthly review in a repo moving this
fast is either late or empty.

### The four audits

| Audit | Asks | Trigger | Output |
|---|---|---|---|
| **Architecture** | Are the shapes still right? Modules, pipelines, boundaries, test layers | Any trigger below | `docs/8N-architecture-review.md` + `PROPOSED` rows + ADRs |
| **Artifact** | Does what we PRODUCE still look right? | Any golden file changes; after a prompt/render change | Updated goldens, read as a diff |
| **Data integrity** | Did a bug corrupt stored data, and can we detect it? | After any defect that WROTE something wrong | A repeatable script (`pnpm audit:*`), not a one-off query |
| **Decision** | Are the ADRs still true? Has one been reversed silently? | Same as architecture | New/superseding ADRs (§4B) |

### Triggers

Run an architecture + decision audit when **any** holds:

- A defect class repeats — **the same shape of bug twice is a design signal, not bad luck**
- A module passes ~500 lines, or a context's service surface passes ~20 exports
- A user reports something the suite was green for *(this alone justifies it)*
- Before opening a new epic, or after closing one
- A decision is being reversed — write the ADR, and ask what else that decision touched
- Ledger `PROPOSED` hits zero *(nothing queued means nobody is looking up)*

### How to run one — measure, don't recall

The value is in the numbers, and they are cheap:

```bash
find libs apps -name '*.ts*' | grep -v node_modules | xargs wc -l | sort -rn | head   # module sizes
for f in libs/*/src/service.ts; do echo "$f $(grep -c '^export ' $f)"; done            # surface area
ls libs/*/tests/*.int.spec.ts | wc -l ; ls apps/*/tests/* 2>/dev/null | wc -l          # test shape
grep -c 'Discovered' libs/*/LOG.md                                                     # escape rate
```

Then, for each finding: **name the defect it already caused.** A finding with no incident behind it
is a preference — record it, but do not rank it above one that has cost real money.

### Rules

- **A review that produces only a document changes nothing.** Every finding lands as a `PROPOSED`
  ledger row with acceptance criteria, an ADR, or a line in this manual. The review of 2026-07-27
  produced five ledger rows, three manual sections and four ADRs — that is the shape.
- **Review your own recent work hardest.** Most of what that review found, the same session had
  built.
- **Escape rate is the metric that matters:** defects found by users ÷ defects found by tests. If
  it is not falling, the tests are testing the wrong layer (§6B).
