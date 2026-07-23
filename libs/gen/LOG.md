# Build Log — GEN (Generation)

## 2026-07-23 — REQ-GEN-021 dialogue captions (→ IN_REVIEW)
**Done:** transcribeAudio helper (provider-routed, dialogue instruction, NO_SPEECH sentinel); ASM captionSource off/lyrics/dialogue captured in the snapshot; dialogue path extracts the assembled cut's audio (ffmpeg -vn), transcribes, burns via the existing SRT machinery; captions select replaces the checkbox on both export forms. Real E2E: "The First Customer" re-exported with captions=dialogue — frame shows the whisper "We're really doing this." burned at the spoken moment. Eval #6's filed gap closed same-day.
**Decisions:** dialogue transcription happens at export time on the final mix (what the viewer hears is what gets captioned); asm→gen dep added (provider gateway).
**Deferred:** speaker colors; lip-timed singing characters.
**Discovered:** —
**Follow-ups:** —
**Gate:** full suite green (133 passed); real E2E frame-verified.

## 2026-07-23 — REQ-GEN-020 MM:SS audio transcription (→ IN_REVIEW)
**Done:** red-first: kind `transcript` (migration 0019 + music_brief.transcript), provider generateText accepts audio (gemini inlineData parts ≤20MB; mock returns timestamped fixture), executor fetches the audio ref's bytes (refs.audioAssetId, in provenance refAssetIds), STB requestTranscript (instruction asks [MM:SS] per lyric line, sections labeled, speakers noted) + materialize onto the brief; ⏱ Transcribe button + transcript block on the script page. Real E2E: Aurora's 2:41 Lyria instrumental → clean section map ([00:00] Intro … [00:36] Chorus … [02:32] Outro) — exactly the scene-timing data the USER described.
**Decisions:** transcript stored on music_brief (canonical, survives regeneration listing); consuming timestamps (cut suggestions/captions) is a separate slice.
**Deferred:** lyric-synced cut suggestions + ANM-003 caption overlays.
**Discovered:** —
**Follow-ups:** —
**Gate:** full suite green (116 passed); real E2E verified in UI.

## 2026-07-23 — REQ-GEN-019 Lyria music generation (→ IN_REVIEW) + Veo price correction
**Done:** full Lyria slice red-first: kind `music` (migration 0017 constraint), route lyria-3-pro-preview + $0.08/track price, provider.generateMusic via Interactions REST (SDK doesn't wrap it; steps→model_output→audio block base64), executor music branch (audio asset, outputAssetIds), STB requestMusicTrack (brief verbatim) + materialize attaches as active track (project-scoped branch BEFORE the shotId guard), ♫ Generate track ≈ $0.08 button. REAL E2E in browser: Aurora brief → 3.9MB MP3 (~2min) generated, attached, serving; billed exactly $0.08. OQ-114 resolved from pricing page. Price drift caught same page: Veo 3.1 fast is $0.10/s at 720p (we billed estimates at $0.15/s) — corrected in priceTable with test cascade (0.975→0.65 for 6.5s).
**Decisions:** brief text goes verbatim to Lyria (it IS the model-ready prompt incl. lyrics); pro model only (clip unused).
**Deferred:** —
**Discovered:** Interactions REST is straightforward — strengthens the Omni video spike case (same surface).
**Follow-ups:** REQ-GEN-020 transcription; USER's new Remotion epic (captured in BACKLOG).
**Gate:** full suite green (114 passed); typecheck clean; real E2E verified.

## 2026-07-23 — REQ-GEN-008 n frame candidates per gesture (PROPOSED → IN_REVIEW)
**Done:** requestFrameBatch in STB (count from config.frame.candidatesDefault, clamped to candidatesMax); per-shot frame click now yields 2 candidates; button label shows the true price ("＋ 2 frames ≈ $0.13"). Browser-verified with real generations: one click on "The wake" → two distinct Nano Banana candidates (~$0.13).
**Decisions:** batch flows (plan-apply first frames, Missing frames) stay at 1/shot — explicit clicks get choice, bulk operations stay cheap.
**Deferred:** —
**Discovered:** —
**Follow-ups:** —
**Gate:** full suite green (94 passed).

## 2026-07-23 — dedicated integration-test database (infra)
**Done:** vitest globalSetup (scripts/test-setup.ts) creates+migrates avd_test on the shared Postgres container; vitest env pins DATABASE_URL to it (scripts/test-db-url.ts single source). Dev DB verified untouched across a full run (org count 1 → 1); worker pg-boss suite passed 3/3 consecutive runs — the live queue worker (on avd) can no longer steal test jobs (root cause of the flake). Real-API ring inherits the test DB too.
**Decisions:** same container, separate database — cheapest isolation that fixes both failure modes; TEST_DATABASE_URL env escape hatch kept.
**Deferred:** per-run schema isolation (only needed if suites ever conflict with each other; they currently self-clean).
**Discovered:** —
**Follow-ups:** —
**Gate:** full suite green on avd_test (92 passed); dev DB pristine.

## 2026-07-23 — daily budget meter + busy-lane button lockout (web polish)
**Done:** extracted dailySpendUsd(db, orgId) (shared by quota guard + UI, single SQL source of truth); project header now shows "spend $X · today $Y / $CAP" with tooltip; frame/take generate buttons (both lanes + Save & generate variants) disable while that shot's lane has a queued/running generation — same activeByShot map that drives the verified pulsing badges.
**Decisions:** lane lockout is per shot per kind (frame vs take), not global — parallel shots stay generatable.
**Deferred:** —
**Discovered:** —
**Follow-ups:** —
**Gate:** gen suite green (25 passed); web tsc clean; header verified in browser.

## 2026-07-23 — REQ-GEN-004 daily per-org spend cap (PROPOSED → IN_REVIEW)
**Done:** red-first quota guard in enqueueGeneration: sums today's billed spend (succeeded+running, UTC day) per org; at/over config.gen.quota.dailyUsdPerOrg (default $5, env GEN_DAILY_USD_CAP) the row is inserted failed with quota_exceeded — visible in RECENT GENERATIONS with retry, never billed, never reaches a provider. Recent-generations rows now show error codes for failed generations.
**Decisions:** no PLT quota aggregate — generation table is the billing source of truth; over-quota enqueue records a failed row instead of throwing so the UI surfaces it without new machinery.
**Deferred:** —
**Discovered:** after a dev-server restart the already-open page's stale bundle drops ALL form submits silently (no POST) until a fresh navigation — worth remembering for browser E2E (fresh-load before clicking).
**Follow-ups:** show remaining daily budget in the header (BACKLOG).
**Gate:** full suite green (92 passed); browser-verified with $0.01 cap then restored.

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

## 2026-07-23 — GEN slice 6: AI image editing (REQ-GEN-012 → IN_REVIEW)
**Done:** red-first — assembleEditPrompt (instruction + identity-preservation), editInput/refs.editSourceAssetId through enqueue (provenance), executor feeds source bytes as first refImage and stamps asset.edit_of; AST updateEntityRef swaps refs with validation (BR-AST-005). Library UI: per-entity AI-edit form. Browser-verified: instruction → visibly new ref thumb; DB chain current(svg mock) → edit_of → original png (untouched, INV-AST-001). Real ring: actual Nano Banana edit ("night, neon reflections") with lineage — 4/4 base ring green.
**Deferred:** per-ref edit picker (MVP edits ref #1); add-alongside mode (replace only); queue-mode edits (inline for now).
**Gate:** 50 mock green + real ring green.

## 2026-07-23 — GEN concurrency slice: per-org video cap (REQ-GEN-011 → IN_REVIEW)
**Done:** red-first `tests/concurrency.int.spec.ts` (4 tests, seeded org at the cap with running take rows) then GREEN in `src/executor.ts`: `videoSlotAvailable` counts running take/retake per org against `config.gen.maxConcurrentVideoPerOrg` (BR-GEN-005, config-only — no literal). `runNextGeneration` now scans queued rows FIFO and skips video rows for capped orgs (per-org slot check memoized per scan), so non-video kinds (frame/text/edit) are never blocked; capped video jobs simply stay `queued` and are claimed on a later call once a slot frees. `runGenerationById` returns `null` for a capped video job, leaving it `queued`.
**Decisions:** worker semantics for the by-id path: returning `null` (no throw) means pg-boss retry/backoff or any later dispatch (e.g. the next completed job's follow-on `runNextGeneration`, or SSE-driven activity) re-claims the job — the cap never fails a job, it only delays its start. Cap check counts only `running` rows; `queued` rows don't consume slots.
**Deferred:** none new.
**Discovered:** pre-existing red in `libs/stb/tests/shot-refs-and-first-frames.int.spec.ts` (references `updateShotRefs`, not yet exported from stb — another slice in flight; fails on clean tree too). Not touched per boundary rules.
**Follow-ups:** claim path is not concurrency-safe across parallel workers (no `FOR UPDATE SKIP LOCKED`) — consistent with existing single-claimer executor; captured as REQ-GEN-018 (PROPOSED, P5 enabler).
**Gate:** `libs/gen` suite green (concurrency 4/4 + all prior); full suite green except the 2 pre-existing stb reds noted above.
