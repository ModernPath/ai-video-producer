# Requirement-Driven Development — Process Manual

Operating manual for building the **AI Video Producer** with full traceability from design docs → requirements → tests → code. Every contributor — human or AI agent — reads it at the start of a session and follows the loop in §6.

This file defines **how** we build. The *what* (domain specs, data models, business rules) lives in `docs/`. Epic-scale work with BDD/E2E evidence also uses **`WORKLIST.md`** and the V-model process in **§5B** (see root **`AGENTS.md`**).

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

**Outer loop (Prompt 3)** replenishes backlog from discoveries and doc changes. **Inner loop (Prompt 2)** builds `READY` requirements. **V-model loop** runs in parallel for epic rows in `WORKLIST.md` when using `epics/`.

---

## 3. Where Everything Lives

```
/AGENTS.md                      ← agent entry (read first)
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
3. Architecture/lint checks pass.
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

## 11. Session Ritual

**Start:** §1 + §6; open target `REQUIREMENTS.md` + `LOG.md` tail; if epic work, open `WORKLIST.md` + epic record; planning pass (§6A) if backlog or docs changed.

**End:** tests green; ledger (+ epic/`WORKLIST` if touched) updated; `LOG.md` entry; coherent stopping state.

---

## 12. Quick Reference

| Need | Doc |
|---|---|
| Agent entry | `AGENTS.md` |
| Terms | `docs/01-ubiquitous-language.md` |
| Contexts | `docs/02-bounded-contexts.md` |
| Domain | `docs/10–17` |
| UX / features | `docs/06-ux-architecture.md`, `docs/features/` |
| Tables / events | `docs/data/40`, `docs/data/41` |
| API | `docs/07-api-contracts.md` |
| Stack | `docs/82-tech-stack.md` |
| OQs / gaps | `docs/08-open-questions.md`, `docs/gap-register.md` |
| V-model | §5B (this file), `WORKLIST.md`, `epics/` |

**The discipline in one sentence:** every change starts as a requirement with acceptance criteria, becomes a failing test, then traced code — and anything we choose not to do is written down as a deferral, not forgotten.
