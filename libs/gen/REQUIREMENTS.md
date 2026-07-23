# Requirements Ledger — GEN (Generation)

## Dashboard — GEN (Generation)
Totals: 0 DONE · 11 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 5 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-GEN-001 | Provenance recorded before execution | P1 | IN_REVIEW | INV-GEN-001 | tests/pipeline.int.spec.ts | src/service.ts |
| REQ-GEN-002 | Outputs are new immutable assets | P1 | IN_REVIEW | INV-GEN-002 | tests/pipeline.int.spec.ts | src/executor.ts |
| REQ-GEN-003 | Cost recorded on completion | P1 | IN_REVIEW | INV-GEN-003 | tests/cost-routing.spec.ts, tests/pipeline.int.spec.ts | src/cost.ts |
| REQ-GEN-004 | Quota check at enqueue | P5 | PROPOSED | INV-GEN-004 | — | — |
| REQ-GEN-005 | Retry semantics (attempt / retry_of) | P2 | PROPOSED | INV-GEN-005 | — | — |
| REQ-GEN-006 | Content-policy terminal failure mapping | P2 | IN_REVIEW | INV-GEN-006 | tests/provider-path.int.spec.ts | src/provider.ts, src/executor.ts |
| REQ-GEN-007 | Model routing from versioned config | P1 | IN_REVIEW | BR-GEN-001 | tests/cost-routing.spec.ts | src/routing.ts |
| REQ-GEN-008 | Frame requests produce n candidates | P2 | PROPOSED | BR-GEN-002 | — | — |
| REQ-GEN-009 | Frame-conditioned takes (start-frame attachment) | P4 | IN_REVIEW | BR-GEN-003 (frame arm) | tests/frame-conditioned.int.spec.ts + real ring + browser | src/service.ts, src/executor.ts, ../stb/src/service.ts |
| REQ-GEN-010 | Provider abstraction: real path → storage → ready | P1 | IN_REVIEW | BR-GEN-004 | tests/provider-path.int.spec.ts | src/provider.ts, src/executor.ts |
| REQ-GEN-011 | Per-org video concurrency cap | P2 | PROPOSED | BR-GEN-005 | — | — |
| REQ-GEN-012 | image_edit creates new asset with lineage | P4 | PROPOSED | BR-GEN-006 | — | — |
| REQ-GEN-013 | Deterministic prompt assembly, snapshotted | P1 | IN_REVIEW | `docs/14` §5 | tests/prompt.spec.ts | src/prompt.ts |
| REQ-GEN-015 | Mock executor (MOCK_GEN) returns fixture media | P1 | IN_REVIEW | `docs/82` §5 (enabler) | tests/pipeline.int.spec.ts | src/executor.ts, src/service.ts |
| REQ-GEN-017 | Live progress reaches the UI (SSE) | P2 | IN_REVIEW | `docs/07` §1, ADR-006 (enabler) | libs/prj/tests/activity.int.spec.ts + browser E2E | libs/prj/src/activity.ts, apps/web (events route, LiveRefresh) |
| REQ-GEN-016 | Jobs execute via queue worker (pg-boss) | P2 | IN_REVIEW | `docs/03` §1–2 (enabler) | apps/worker/tests/handlers.int.spec.ts + browser E2E | apps/worker/src/*, libs/shared/src/queue.ts |

### REQ-GEN-016 — Jobs execute via queue worker (pg-boss)
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must (enabler)
- **Source:** `docs/03` §1–2, ADR-002
- **Statement:** Generations and exports run in `apps/worker` via pg-boss jobs (`gen-execute`, `asm-export`) addressed by row id; the web tier enqueues and never blocks on model/ffmpeg work. Dev fallback: `WORKER_MODE=inline` keeps single-process ergonomics.
- **Acceptance criteria:**
  - GIVEN a queued pg-boss `gen-execute` job WHEN the worker handler runs THEN the generation succeeds and its STB candidate is materialized.
  - GIVEN queue mode WHEN the UI requests a frame THEN the browser sees the candidate after the worker processes it (browser evidence).
- **Tests:** `apps/worker/tests/handlers.int.spec.ts` + browser E2E · **Code:** `apps/worker/src/*`, `libs/shared/src/queue.ts` · **Log:** LOG 2026-07-23 (slice 3)

### REQ-GEN-017 — Live progress reaches the UI (SSE)
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must (enabler)
- **Source:** `docs/07` §1 realtime, `docs/41` §3, ADR-006
- **Statement:** `GET /api/projects/{id}/events` streams SSE; the client refreshes project views on events, so worker results appear without manual reload. MVP transport: DB activity-fingerprint poll-bridge behind the SSE contract; outbox push replaces the bridge later (deferral logged).
- **Acceptance criteria:**
  - GIVEN a project WHEN a generation completes THEN the activity fingerprint changes (integration-tested).
  - GIVEN the storyboard open in queue mode WHEN the worker finishes a take THEN the take appears without manual reload (browser evidence).
- **Tests:** `libs/prj/tests/activity.int.spec.ts` + browser E2E · **Code:** `libs/prj/src/activity.ts`, `apps/web/app/api/projects/[id]/events/route.ts`, `apps/web/components/LiveRefresh.tsx` · **Log:** LOG 2026-07-23 (slice 4)

*(REQ-GEN-014 reserved for event emission — folded into 001/003 acceptance for now; split if it grows.)*

---

### REQ-GEN-001 — Provenance recorded before execution
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must · **Owner:** —
- **Raised-by:** seeded from `docs/14-generation.md` (Prompt 1)
- **Source:** INV-GEN-001
- **Statement:** Before any model call executes, the generation row persists model id, assembled prompt snapshot, params, reference asset ids, requesting principal, and target.
- **Acceptance criteria:**
  - GIVEN a take request WHEN enqueued THEN a `gen.generation` row exists with status `queued`, model id from config, full prompt snapshot, and target (shot id) — before the executor runs.
  - GIVEN the executor crashes before completion THEN the row still holds the full snapshot (provenance survives failure).
- **Tests:** `tests/pipeline.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-002 — Outputs are new immutable assets
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-GEN-002
- **Statement:** A completed generation writes its output as a new `ast.asset` row (+ storage object) and never mutates an existing asset.
- **Acceptance criteria:**
  - GIVEN a completed frame generation THEN a new asset row exists with `generation_id` set and status `ready`.
  - GIVEN a regeneration for the same shot/slot THEN a second asset exists; the first is untouched.
- **Tests:** `tests/pipeline.int.spec.ts` · **Code:** `src/executor.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-003 — Cost recorded on completion
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-GEN-003
- **Statement:** On completion the generation row records actual cost in USD (video: duration × per-second rate; image: per-image rate from the price table).
- **Acceptance criteria:**
  - GIVEN a completed 6.5s take THEN `cost_usd = 0.65` (from `priceTable.videoPerSecondUsd`).
  - GIVEN a failed generation THEN `cost_usd` reflects what the provider charged (0 for pre-execution failures).
- **Tests:** `tests/cost-routing.spec.ts, tests/pipeline.int.spec.ts` · **Code:** `src/cost.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-004 — Quota check at enqueue
- **Status:** PROPOSED · **Stage:** P5 · **Source:** INV-GEN-004 — needs PLT quota aggregate first.

### REQ-GEN-005 — Retry semantics
- **Status:** PROPOSED · **Stage:** P2 · **Source:** INV-GEN-005 — same id + `attempt` increments; terminal failure retry = new generation with `retry_of`.

### REQ-GEN-006 — Content-policy terminal failure mapping
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** INV-GEN-006, `docs/14` §6
- **Acceptance criteria:**
  - GIVEN the provider raises a content-policy rejection WHEN executing THEN the generation is terminal `failed` with `error_code = content_policy`, no asset is created, and it is never auto-retried.

### REQ-GEN-007 — Model routing from versioned config
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** BR-GEN-001
- **Statement:** Kind → model resolution comes exclusively from `@avd/shared/config` model routes; no model id literals elsewhere.
- **Acceptance criteria:**
  - GIVEN kind `take` THEN resolved model is `modelRoutes.take`; GIVEN kind `frame` quality `draft` THEN `modelRoutes.frame.draft`.
  - GIVEN a repo-wide grep for `gemini-` outside `libs/shared/src/config` THEN zero hits (test enforced).
- **Tests:** `tests/cost-routing.spec.ts` · **Code:** `src/routing.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-008 — Frame requests produce n candidates
- **Status:** PROPOSED · **Stage:** P2 · **Source:** BR-GEN-002 — default `config.frame.candidatesDefault`, max `candidatesMax`.

### REQ-GEN-009 — Frame-conditioned takes (start-frame attachment)
- **Status:** IN_REVIEW · **Stage:** P4 · **Priority:** must
- **Source:** BR-GEN-003 (frame arm; entity/style ref arms follow with the entity library), BR-STB-002
- **Statement:** When a shot has a selected start frame, RequestTake records the frame's asset id in the generation's provenance refs and the executor fetches its bytes and passes them to the provider (`image` param — verified by OQ-101 spike). Without a selection, takes remain text-to-video.
- **Acceptance criteria:**
  - GIVEN a shot with a selected start frame WHEN a take executes THEN the provider receives startFrame bytes/mime matching the stored asset (stub-verified) and the generation's refs record the asset id.
  - GIVEN no selected frame THEN the provider receives no startFrame.
  - Real ring: image → frame-conditioned take chain passes (RUN_REAL_VIDEO).

### REQ-GEN-010 — Provider abstraction: real path → storage → ready
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** BR-GEN-004
- **Statement:** The executor calls a `GenProvider` port (mock, stub, or Gemini); provider media bytes land in object storage as ready assets with billed cost from the price table. The concrete Omni video adapter ships after the OQ-101/102 paid spike; Gemini text+image adapters ship now.
- **Acceptance criteria:**
  - GIVEN a stub provider WHEN a frame executes THEN its bytes are stored, asset `ready`, cost = image price (billed).
  - GIVEN a stub provider returning a 6.5s video THEN cost_usd = 0.65 and the asset carries the returned duration.
  - GIVEN no provider override THEN MOCK_GEN=1 selects the mock provider; otherwise the Gemini adapter (requires GEMINI_API_KEY).

### REQ-GEN-011 — Per-org video concurrency cap
- **Status:** PROPOSED · **Stage:** P2 · **Source:** BR-GEN-005 — `config.gen.maxConcurrentVideoPerOrg`, FIFO overflow.

### REQ-GEN-012 — image_edit creates new asset with lineage
- **Status:** PROPOSED · **Stage:** P4 · **Source:** BR-GEN-006 — `edit_of` chain, INV-AST-001.

### REQ-GEN-013 — Deterministic prompt assembly, snapshotted
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** `docs/14-generation.md` §5
- **Statement:** Prompt assembly per kind is a pure function of (project, shot, style kit, entities); the assembled prompt is stored verbatim on the generation row with `prompt_template_version`.
- **Acceptance criteria:**
  - GIVEN identical inputs THEN assembly output is byte-identical (golden-file test).
  - GIVEN a take request THEN the snapshot contains format, style, entity, shot, and audio blocks in documented order.
- **Tests:** `tests/prompt.spec.ts` · **Code:** `src/prompt.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-015 — Mock executor (MOCK_GEN) returns fixture media
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must (enabler)
- **Source:** `docs/82-tech-stack.md` §5, `docs/03` §5
- **Statement:** With `MOCK_GEN=1`, the executor completes generations with fixture assets (image/video/audio/text) at zero provider cost, exercising the full queue → execute → asset → complete path.
- **Acceptance criteria:**
  - GIVEN MOCK_GEN=1 and a queued frame generation WHEN the worker runs THEN the generation succeeds with a fixture image asset and `cost_usd = 0`.
  - GIVEN MOCK_GEN unset and no `GEMINI_API_KEY` THEN enqueue fails fast with a clear config error.
- **Tests:** `tests/pipeline.int.spec.ts` · **Code:** `src/executor.ts, src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)
