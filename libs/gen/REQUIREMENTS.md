# Requirements Ledger — GEN (Generation)

## Dashboard — GEN (Generation)
Totals: 0 DONE · 0 IN_REVIEW · 0 IN_PROGRESS · 6 READY · 8 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-GEN-001 | Provenance recorded before execution | P1 | READY | INV-GEN-001 | — | — |
| REQ-GEN-002 | Outputs are new immutable assets | P1 | READY | INV-GEN-002 | — | — |
| REQ-GEN-003 | Cost recorded on completion | P1 | READY | INV-GEN-003 | — | — |
| REQ-GEN-004 | Quota check at enqueue | P5 | PROPOSED | INV-GEN-004 | — | — |
| REQ-GEN-005 | Retry semantics (attempt / retry_of) | P2 | PROPOSED | INV-GEN-005 | — | — |
| REQ-GEN-006 | Content-policy terminal failure mapping | P2 | PROPOSED | INV-GEN-006 | — | — |
| REQ-GEN-007 | Model routing from versioned config | P1 | READY | BR-GEN-001 | — | — |
| REQ-GEN-008 | Frame requests produce n candidates | P2 | PROPOSED | BR-GEN-002 | — | — |
| REQ-GEN-009 | Take reference attachment & priority | P4 | PROPOSED | BR-GEN-003 | — | — |
| REQ-GEN-010 | Async video delivery → storage → ready | P1 | PROPOSED | BR-GEN-004 | — | — |
| REQ-GEN-011 | Per-org video concurrency cap | P2 | PROPOSED | BR-GEN-005 | — | — |
| REQ-GEN-012 | image_edit creates new asset with lineage | P4 | PROPOSED | BR-GEN-006 | — | — |
| REQ-GEN-013 | Deterministic prompt assembly, snapshotted | P1 | READY | `docs/14` §5 | — | — |
| REQ-GEN-015 | Mock executor (MOCK_GEN) returns fixture media | P1 | READY | `docs/82` §5 (enabler) | — | — |

*(REQ-GEN-014 reserved for event emission — folded into 001/003 acceptance for now; split if it grows.)*

---

### REQ-GEN-001 — Provenance recorded before execution
- **Status:** READY · **Stage:** P1 · **Priority:** must · **Owner:** —
- **Raised-by:** seeded from `docs/14-generation.md` (Prompt 1)
- **Source:** INV-GEN-001
- **Statement:** Before any model call executes, the generation row persists model id, assembled prompt snapshot, params, reference asset ids, requesting principal, and target.
- **Acceptance criteria:**
  - GIVEN a take request WHEN enqueued THEN a `gen.generation` row exists with status `queued`, model id from config, full prompt snapshot, and target (shot id) — before the executor runs.
  - GIVEN the executor crashes before completion THEN the row still holds the full snapshot (provenance survives failure).
- **Tests:** — · **Code:** — · **Log:** —

### REQ-GEN-002 — Outputs are new immutable assets
- **Status:** READY · **Stage:** P1 · **Priority:** must
- **Source:** INV-GEN-002
- **Statement:** A completed generation writes its output as a new `ast.asset` row (+ storage object) and never mutates an existing asset.
- **Acceptance criteria:**
  - GIVEN a completed frame generation THEN a new asset row exists with `generation_id` set and status `ready`.
  - GIVEN a regeneration for the same shot/slot THEN a second asset exists; the first is untouched.
- **Tests:** — · **Code:** — · **Log:** —

### REQ-GEN-003 — Cost recorded on completion
- **Status:** READY · **Stage:** P1 · **Priority:** must
- **Source:** INV-GEN-003
- **Statement:** On completion the generation row records actual cost in USD (video: duration × per-second rate; image: per-image rate from the price table).
- **Acceptance criteria:**
  - GIVEN a completed 6.5s take THEN `cost_usd = 0.65` (from `priceTable.videoPerSecondUsd`).
  - GIVEN a failed generation THEN `cost_usd` reflects what the provider charged (0 for pre-execution failures).
- **Tests:** — · **Code:** — · **Log:** —

### REQ-GEN-004 — Quota check at enqueue
- **Status:** PROPOSED · **Stage:** P5 · **Source:** INV-GEN-004 — needs PLT quota aggregate first.

### REQ-GEN-005 — Retry semantics
- **Status:** PROPOSED · **Stage:** P2 · **Source:** INV-GEN-005 — same id + `attempt` increments; terminal failure retry = new generation with `retry_of`.

### REQ-GEN-006 — Content-policy terminal failure mapping
- **Status:** PROPOSED · **Stage:** P2 · **Source:** INV-GEN-006 — error taxonomy `docs/14` §6; OQ-105 for UX copy.

### REQ-GEN-007 — Model routing from versioned config
- **Status:** READY · **Stage:** P1 · **Priority:** must
- **Source:** BR-GEN-001
- **Statement:** Kind → model resolution comes exclusively from `@avd/shared/config` model routes; no model id literals elsewhere.
- **Acceptance criteria:**
  - GIVEN kind `take` THEN resolved model is `modelRoutes.take`; GIVEN kind `frame` quality `draft` THEN `modelRoutes.frame.draft`.
  - GIVEN a repo-wide grep for `gemini-` outside `libs/shared/src/config` THEN zero hits (test enforced).
- **Tests:** — · **Code:** — · **Log:** —

### REQ-GEN-008 — Frame requests produce n candidates
- **Status:** PROPOSED · **Stage:** P2 · **Source:** BR-GEN-002 — default `config.frame.candidatesDefault`, max `candidatesMax`.

### REQ-GEN-009 — Take reference attachment & priority
- **Status:** PROPOSED · **Stage:** P4 · **Source:** BR-GEN-003 — frames > entities > style, capped at provider limit.

### REQ-GEN-010 — Async video delivery → storage → ready
- **Status:** PROPOSED · **Stage:** P1 · **Source:** BR-GEN-004 — provider URI polling, download to object storage, then asset `ready`. Real-API path; mock path covered by REQ-GEN-015.

### REQ-GEN-011 — Per-org video concurrency cap
- **Status:** PROPOSED · **Stage:** P2 · **Source:** BR-GEN-005 — `config.gen.maxConcurrentVideoPerOrg`, FIFO overflow.

### REQ-GEN-012 — image_edit creates new asset with lineage
- **Status:** PROPOSED · **Stage:** P4 · **Source:** BR-GEN-006 — `edit_of` chain, INV-AST-001.

### REQ-GEN-013 — Deterministic prompt assembly, snapshotted
- **Status:** READY · **Stage:** P1 · **Priority:** must
- **Source:** `docs/14-generation.md` §5
- **Statement:** Prompt assembly per kind is a pure function of (project, shot, style kit, entities); the assembled prompt is stored verbatim on the generation row with `prompt_template_version`.
- **Acceptance criteria:**
  - GIVEN identical inputs THEN assembly output is byte-identical (golden-file test).
  - GIVEN a take request THEN the snapshot contains format, style, entity, shot, and audio blocks in documented order.
- **Tests:** — · **Code:** — · **Log:** —

### REQ-GEN-015 — Mock executor (MOCK_GEN) returns fixture media
- **Status:** READY · **Stage:** P1 · **Priority:** must (enabler)
- **Source:** `docs/82-tech-stack.md` §5, `docs/03` §5
- **Statement:** With `MOCK_GEN=1`, the executor completes generations with fixture assets (image/video/audio/text) at zero provider cost, exercising the full queue → execute → asset → complete path.
- **Acceptance criteria:**
  - GIVEN MOCK_GEN=1 and a queued frame generation WHEN the worker runs THEN the generation succeeds with a fixture image asset and `cost_usd = 0`.
  - GIVEN MOCK_GEN unset and no `GEMINI_API_KEY` THEN enqueue fails fast with a clear config error.
- **Tests:** — · **Code:** — · **Log:** —
