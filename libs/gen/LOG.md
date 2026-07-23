# Build Log — GEN (Generation)

## 2026-07-23 — Context scaffolded (Prompt 0B)
**Done:** lib skeleton, empty ledger, build guide.
**Decisions:** contracts in `./contracts` (Zod canonical).
**Deferred:** ledger seeding → Prompt 1.
**Discovered:** —
**Follow-ups:** seed requirements from docs/14-generation.md.
**Gate:** n/a (no tests yet).

## 2026-07-23 — Ledger seeded (Prompt 1)
**Done:** 14 requirements derived from docs/14-generation.md; 6 READY for the Phase-1 golden thread (001, 002, 003, 007, 013, 015), 8 PROPOSED.
**Decisions:** REQ-GEN-014 (events) folded into 001/003 acceptance until it grows. Mock executor is a first-class requirement (015), not a test hack — it is the dev/CI path.
**Deferred:** quota check (004) → P5, needs PLT quota aggregate.
**Discovered:** image price placeholders already in BACKLOG inbox.
**Follow-ups:** Prompt 2 on the 6 READY requirements next.
**Gate:** n/a (no new code).

## 2026-07-23 — GEN slice 1: pipeline core (6 × READY → IN_REVIEW)
**Done:** REQ-GEN-001/002/003/007/013/015 — enqueue with full provenance snapshot, config-only routing, deterministic prompt assembly (template v1), cost from price table, mock executor completing queued generations into ready fixture assets. Migration 0002 (gen.generation, ast.asset). 16/16 tests green (unit + golden + integration vs compose pg).
**Decisions:** executor claims oldest queued (no pg-boss yet — fine single-worker; queue lib when apps/worker lands). Literal-scanner test enforces REQ-GEN-007 repo-wide.
**Deferred:** real provider path → REQ-GEN-010; object-storage writes (fixture:// keys) → AST slice; events/outbox → next slices.
**Discovered:** ast.asset created here as enabler — AST ledger seeding must note it (routed: AST LOG below).
**Follow-ups:** human review to move 6 reqs IN_REVIEW → DONE.
**Gate:** full suite 16/16 green.

## 2026-07-23 — GEN slice 2: provider port + real Gemini adapter (006/010 → IN_REVIEW)
**Done:** red-first stub-injected tests — GenProvider port (text/image/video), executor refactored provider-agnostic (mock fixtures now live in mockProvider; billsCost drives INV-GEN-003 zero-cost vs price-table). Real Gemini adapter via @google/genai for text + image with error mapping (safety → content_policy terminal, INV-GEN-006 verified: failed, mapped code, no asset). Omni video adapter intentionally fails provider_unavailable pending OQ-101/102 paid spike. Browser regression: UI take generation works through the new port.
**Decisions:** provider precedence: explicit injection > MOCK_GEN > gemini(key required). Literal-scanner upgraded to model-id regex (doc links allowed) — it caught its own comment twice; working as designed.
**Blocked-on-user:** real-API demo needs GEMINI_API_KEY in .env; Omni spike additionally needs budget approval (~$1-2 of takes) — flagged in BACKLOG.
**Gate:** 34/34 green.

## 2026-07-23 — GEN slice 3: worker extraction (REQ-GEN-016 → IN_REVIEW)
**Done:** apps/worker (pg-boss consumer, tsx) with testable handlers composing runGenerationById + STB materialization and runExportById; libs/shared/queue (createBoss, queue names, WORKER_MODE); executor/asm refactored with by-id runners; web actions dispatch to queue when WORKER_MODE=queue (inline fallback). Remaining raw buttons → SubmitButton. Browser-verified: UI take → pg-boss → worker log → candidate visible after reload.
**Decisions:** worker composes contexts (host app, like web); handlers take injected db for tests.
**Discovered:** queue mode lacks live refresh — SSE (ADR-006) promoted to next priority. Also: loop tooling learning — long shell chains must pin cwd (a drifted cwd silently skipped this trace step once; re-applied).
**Gate:** 36/36 green.
