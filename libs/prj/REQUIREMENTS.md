# Requirements Ledger — PRJ (Projects)

## Dashboard — PRJ (Projects)
Totals: 4 DONE · 0 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 0 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-PRJ-001 | Create with defaults; org-scoped | P1 | DONE | INV-PRJ-001, BR-PRJ-001 | tests/vertical.int.spec.ts | src/schema.ts, web actions (built as golden-thread enabler; backfilled row) |
| REQ-PRJ-002 | Idempotent creation (command_id) | P2 | DONE | BR-PRJ papercut (USER dup project) | tests/create.int.spec.ts + browser double-click | src/service.ts, migration 0011 |
| REQ-PRJ-003 | Archive lifecycle | P2 | DONE | BR-PRJ-003 (`docs/11` §4) | tests/archive.int.spec.ts | src/service.ts, ../gen/src/service.ts (enqueue guard) |
| REQ-PRJ-004 | Cost meter read model | P2 | DONE | INV-PRJ-004 (`docs/11` §3) | tests/cost-meter.int.spec.ts | src/service.ts (costMeterUsd) |

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
