# Requirements Ledger — PRJ (Projects)

## Dashboard — PRJ (Projects)
Totals: 0 DONE · 2 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 2 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-PRJ-001 | Create with defaults; org-scoped | P1 | IN_REVIEW | INV-PRJ-001, BR-PRJ-001 | tests/vertical.int.spec.ts | src/schema.ts, web actions (built as golden-thread enabler; backfilled row) |
| REQ-PRJ-002 | Idempotent creation (command_id) | P2 | IN_REVIEW | BR-PRJ papercut (USER dup project) | tests/create.int.spec.ts + browser double-click | src/service.ts, migration 0011 |
| REQ-PRJ-003 | Archive lifecycle | P2 | PROPOSED | BR-PRJ-003 (partially built ad hoc — needs test backfill) | — | — |
| REQ-PRJ-004 | Cost meter read model | P2 | PROPOSED | INV-PRJ-004 (built ad hoc in storyboard header — needs test backfill) | — | — |

---

### REQ-PRJ-002 — Idempotent creation (command_id)
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Raised-by:** duplicate "Wake the City" from a double-submit (BACKLOG 2026-07-23)
- **Source:** `docs/07` §3 command envelope
- **Statement:** Project creation carries a client-generated command id; replays with the same id return the existing project instead of inserting a duplicate.
- **Acceptance criteria:**
  - GIVEN two createProject calls with the same commandId THEN one row exists and both return the same project id.
  - GIVEN different commandIds THEN two projects are created.
- **Tests:** `tests/create.int.spec.ts` + browser (double-click → 1 row) · **Code:** `src/service.ts`, migration 0011, per-render commandId in create form · **Log:** LOG 2026-07-23
