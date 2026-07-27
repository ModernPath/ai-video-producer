# Requirements Ledger — PRJ (Projects)

## Dashboard — PRJ (Projects)
Totals: 6 DONE · 0 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 0 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-PRJ-001 | Create with defaults; org-scoped | P1 | DONE | INV-PRJ-001, BR-PRJ-001 | tests/vertical.int.spec.ts | src/schema.ts, web actions (built as golden-thread enabler; backfilled row) |
| REQ-PRJ-002 | Idempotent creation (command_id) | P2 | DONE | BR-PRJ papercut (USER dup project) | tests/create.int.spec.ts + browser double-click | src/service.ts, migration 0011 |
| REQ-PRJ-003 | Archive lifecycle | P2 | DONE | BR-PRJ-003 (`docs/11` §4) | tests/archive.int.spec.ts | src/service.ts, ../gen/src/service.ts (enqueue guard) |
| REQ-PRJ-004 | Cost meter read model | P2 | DONE | INV-PRJ-004 (`docs/11` §3) | tests/cost-meter.int.spec.ts | src/service.ts (costMeterUsd) |
| REQ-PRJ-005 | Compiled Style Card stored on the project | P9 | DONE | EPIC-STB-001 SR-DIR-008 (USER 2026-07-26 "how do I test my Kaurismäki shortfilm?") | tests/style-card-store.int.spec.ts (9) | src/service.ts (setProjectStyleCard/getProjectStyleCard), migration 0023, web compileStyleCardAction |
| REQ-PRJ-006 | Film runtime: settable, and read from the prompt when stated | P9 | DONE | USER 2026-07-26 "it's only 30seconds instead of minute that I was asking for" | tests/brief-duration.spec.ts (8) + style-card-store.int.spec.ts | src/brief-duration.ts, setProjectTargetDuration, web runtime field |

---

### REQ-PRJ-002 — Idempotent creation (command_id)
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Raised-by:** duplicate "Wake the City" from a double-submit (BACKLOG 2026-07-23)
- **Source:** `docs/07` §3 command envelope
- **Statement:** Project creation carries a client-generated command id; replays with the same id return the existing project instead of inserting a duplicate.
- **Acceptance criteria:**
  - GIVEN two createProject calls with the same commandId THEN one row exists and both return the same project id.
  - GIVEN different commandIds THEN two projects are created.
- **Tests:** `tests/create.int.spec.ts` + browser (double-click → 1 row) · **Code:** `src/service.ts`, migration 0011, per-render commandId in create form · **Log:** LOG 2026-07-23

---

### REQ-PRJ-003 — Archive lifecycle
- **Status:** DONE · **Stage:** P2 · **Priority:** must · **Owner:** —
- **Raised-by:** archive toggle built ad hoc during golden thread; ledger backfill (LOG 2026-07-23)
- **Source:** BR-PRJ-003 (`docs/11-projects.md` §4); status enum `docs/data/40` §3
- **Statement:** A project can be archived (status `active` → `archived`) and unarchived; while archived, new generation enqueues for the project are rejected, but existing rows and assets remain readable.
- **Acceptance criteria:**
  - GIVEN an active project WHEN archiveProject THEN project.status = `archived`.
  - GIVEN an archived project WHEN enqueueGeneration for it THEN the enqueue is rejected with error code `project_archived` and no generation row is inserted (BR-PRJ-003).
  - GIVEN an archived project WHEN unarchiveProject THEN project.status = `active` and enqueueGeneration succeeds again.
- **Tests:** `tests/archive.int.spec.ts`
- **Code:** `src/service.ts` (archiveProject/unarchiveProject/getProjectStatus, // BR-PRJ-003), `libs/gen/src/service.ts` (enqueue guard, error code `project_archived`)
- **Log:** LOG 2026-07-23 (test backfill slice)
- **Deferred / notes:** export blocking (BR-PRJ-003 also names exports) is not enforced in ASM yet — captured for ASM, see LOG Discovered.

---

### REQ-PRJ-004 — Cost meter read model
- **Status:** DONE · **Stage:** P2 · **Priority:** must · **Owner:** —
- **Raised-by:** cost meter built ad hoc as inline SQL in the storyboard header; ledger backfill (LOG 2026-07-23)
- **Source:** INV-PRJ-004 (`docs/11-projects.md` §3): cost meter = sum of `succeeded`+`running` generation costs for the project (read model over GEN rows, docs/02 §5)
- **Statement:** PRJ exposes `costMeterUsd(db, projectId)` returning the project's spend as the sum of `cost_usd` over the project's generations in status `succeeded` or `running`; other statuses (queued/failed/canceled) do not count.
- **Acceptance criteria:**
  - GIVEN generations for the project with known costs in statuses succeeded and running WHEN costMeterUsd THEN it returns exactly their sum (INV-PRJ-004).
  - GIVEN additional queued/failed/canceled generations with non-null costs THEN they are excluded from the sum.
  - GIVEN a project with no generations THEN costMeterUsd returns 0.
- **Tests:** `tests/cost-meter.int.spec.ts`
- **Code:** `src/service.ts` (costMeterUsd, // INV-PRJ-004)
- **Log:** LOG 2026-07-23 (test backfill slice)
- **Deferred / notes:** wiring the storyboard header (`apps/web/app/p/[id]/page.tsx`) to `costMeterUsd` is left for the integrator (that file is out of scope for this slice); the current inline SQL there sums all statuses and thus diverges from INV-PRJ-004 until wired.

### REQ-PRJ-005 — Compiled Style Card stored on the project
- **Status:** DONE · **Stage:** P9 · **Priority:** should
- **Raised-by:** USER 2026-07-26: "hmm, how do I test my Kaurismäki shortfilm?" — the directing picker offered only the six built-ins, so a brief compiled by REQ-GEN-025 had nowhere to live and nothing in the app could use it.
- **Source:** `epics/EPIC-STB-001-director-briefs.md` SR-DIR-008 (SCN-DIR-001)
- **Statement:** A Style Card compiled from the project's own prompt shall be stored on the project, validated against the contract on the way in, and take precedence over the six seed keys. Exactly one style source is active at a time.
- **Acceptance criteria:**
  - GIVEN a project with no card THEN `getProjectStyleCard` returns null.
  - GIVEN a compiled card THEN it round-trips with provenance intact (the UI shows what was researched) and applies the card's `defaults.audioMode`, as selecting a seed does.
  - GIVEN a stored card THEN `archetype` is null — a compiled card is not one of the six keys.
  - GIVEN a card that fails the contract THEN the write is rejected: an invalid card must never reach the prompt builders, which assume a valid contract.
  - GIVEN a second compile THEN the card is REPLACED, not merged.
  - GIVEN a built-in archetype is chosen afterwards THEN the compiled card is cleared, so "what does this film look like?" has exactly one answer.
  - GIVEN an unrelated project update THEN the stored card survives.
- **Tests:** `tests/style-card-store.int.spec.ts` (9)
- **Code:** `src/service.ts` (`setProjectStyleCard`, `getProjectStyleCard`, `setProjectArchetype` clearing) · `migrations/0023_project_style_card.sql` · `apps/web/app/actions.ts` (`compileStyleCardAction`) · `apps/web/app/p/[id]/page.tsx` (compile button + card panel) · `libs/stb/src/service.ts` (`recipeFor` prefers the compiled card)
- **Log:** see LOG 2026-07-26
- **Deferred / notes:** the card is not yet editable axis-by-axis in the UI (UR-DIR-002) — recompiling replaces it. Compiling is a blocking server action taking ~25s; it is not routed through the generation ledger because, like `research.ts`, it is a single near-free text call.

### REQ-PRJ-006 — Film runtime: settable, and read from the prompt when stated
- **Status:** DONE · **Stage:** P9 · **Priority:** should
- **Raised-by:** USER 2026-07-26: "Also it's only 30seconds instead of minute that I was asking for."
- **Statement:** A project's target runtime shall be editable, and a runtime stated in the user's own prompt shall be honoured when a Style Card is compiled from it. Investigation showed two separate causes: the runtime was displayed in the header but editable NOWHERE, and nothing ever read a duration out of the brief.
- **Acceptance criteria:**
  - GIVEN "1-minute feature film" THEN 60 is parsed; likewise plain minutes, worded numbers ("two minutes"), seconds in every spelling ("30s", "45-second", "90 secs"), and M:SS ("1:30" → 90).
  - GIVEN a prompt that says nothing about length THEN null — the existing target stands rather than being guessed at.
  - GIVEN a number that is plainly not a runtime ("the 1980s", "3 dancers", "16mm") THEN null.
  - GIVEN a runtime outside what the product can build ("3 hour epic", "2 second flash") THEN null rather than a clamp, because that was not a runtime request.
  - GIVEN several runtimes THEN the first wins ("a 1-minute film, cut down from a 3 minute version" → 60).
  - GIVEN `setProjectTargetDuration` THEN the value is clamped into `config.project.min/maxTargetSeconds`.
  - GIVEN the workspace THEN the runtime is editable beside the directing controls.
- **Tests:** `tests/brief-duration.spec.ts` (8) · `tests/style-card-store.int.spec.ts` (runtime block)
- **Code:** `src/brief-duration.ts` (`parseRequestedDurationS`) · `src/service.ts` (`setProjectTargetDuration`) · `apps/web/app/actions.ts` (`setTargetDurationAction`, and `compileStyleCardAction` applying a parsed runtime) · `apps/web/app/p/[id]/page.tsx` (runtime field) · `libs/shared/src/config/limits.ts` (`project.min/maxTargetSeconds`)
- **Deferred / notes:** changing the runtime does not re-plan existing shots — the target guides the NEXT shot plan. The user's own saved prompt reads "ModernPath short film…" with no runtime in it, so the parser correctly returns null there; the editable field is what fixes their case.
