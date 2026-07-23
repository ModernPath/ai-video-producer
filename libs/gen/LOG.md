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

## 2026-07-23 — GEN slice 4: SSE live updates (REQ-GEN-017 → IN_REVIEW)
**Done:** red-first activity fingerprint (libs/prj/activity — cross-context read model per docs/02 §5) covering generations, shots, selections, candidates, exports, scripts, proposals; SSE route (events: hello/changed + keepalives, abort cleanup) polling the fingerprint at 1.5s; LiveRefresh client (EventSource → router.refresh, live/reconnecting indicator) on storyboard + script pages. Browser-verified: queued take appeared with zero manual reloads; ● live indicator green.
**Deferred (explicit):** poll-bridge → outbox push when event volume warrants (the SSE contract to the client stays identical). Recorded here per non-negotiable 2.
**Gate:** 37/37 green.

## 2026-07-23 — Real-API E2E ring established (user-provided GEMINI_API_KEY)
**Done:** `pnpm test:real` (RUN_REAL_API=1, key from .env, never logged): real gemini-3.6-flash text + real Nano Banana draft image through the full pipeline (provider → storage → ready asset → billed cost). 2/2 green, ≈$0.04 spent. DoD updated: root CLAUDE.md §9.8 requires this ring for provider-facing requirements; docs/82 §6 updated.
**Next:** Omni video real E2E = the OQ-101/102/104 spike (user's key now covers it; ~$0.40–1.00).
**Gate:** real ring 2/2 green.

## 2026-07-23 — Omni/Veo video spike + REAL take in product (REQ-GEN-010 completed for video)
**Done:** paid spike sequence (~$1.00 total): (1) SDK types closed OQ-101/102/104 free (lastFrame/referenceImages/resolution/durationSeconds exist); (2) generateAudio is Vertex-only ($0 probe); (3) gemini-omni-flash-preview serves ONLY the Interactions API — not wrapped by SDK 1.52 → new OQ-112; takes routed to veo-3.1-fast-generate-preview (BR-GEN-001 config change only); (4) Veo durations are {4,6,8}s — provider snaps, shot cap now 8s; (5) real 4s take through pipeline in E2E ($0.40) and real 6s take from the UI through queue+worker+SSE ($0.60) — cost meter shows real spend.
**Worker ops learning:** pkill pattern must match `tsx/dist/cli.mjs` — a surviving mock worker raced the real one and stole two jobs (caught via cost=0 + SVG mime). Single-worker check added to restart routine.
**Discovered → BACKLOG:** verify Veo 3.1 fast per-second pricing (table still uses Omni's $0.10/s); take request should attach selected start frame (REQ-GEN-009 now high value — image param verified).
**Gate:** mock suite 42/45 green (3 real skipped by default); real ring 3/3 green.

## 2026-07-23 — GEN slice 5: frame-conditioned takes (REQ-GEN-009 → IN_REVIEW)
**Done:** red-first capture-stub tests — refs.startFrameAssetId flows enqueue → snapshot (refAssetIds provenance, INV-GEN-001) → executor fetches bytes from storage → provider.startFrame; STB requestTake resolves selected frame automatically; no selection → text-to-video unchanged. Real ring upgraded to the product chain: real draft frame conditions a real 4s take (1.1MB MP4, $0.40 — visibly denser than text-only). Browser+DB verified: UI take's provenance ref === selected frame asset id.
**Deferred:** entity/style reference arms of BR-GEN-003 → entity library slice; end-frame (lastFrame param) → with retake/edit UX.
**Gate:** mock 44 green · real ring 3/3 green (chain).
