# Requirements Ledger — GEN (Generation)

## Dashboard — GEN (Generation)
Totals: 31 DONE · 0 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 1 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-GEN-001 | Provenance recorded before execution | P1 | DONE | INV-GEN-001 | tests/pipeline.int.spec.ts | src/service.ts |
| REQ-GEN-002 | Outputs are new immutable assets | P1 | DONE | INV-GEN-002 | tests/pipeline.int.spec.ts | src/executor.ts |
| REQ-GEN-003 | Cost recorded on completion | P1 | DONE | INV-GEN-003 | tests/cost-routing.spec.ts, tests/pipeline.int.spec.ts | src/cost.ts |
| REQ-GEN-004 | Daily per-org spend cap at enqueue | P5 | DONE | INV-GEN-004 | tests/quota.int.spec.ts + browser E2E | src/service.ts enqueueGeneration, config.gen.quota |
| REQ-GEN-005 | Retry of terminal failures (retry_of provenance) | P2 | DONE | INV-GEN-005 | tests/retry.int.spec.ts (browser: UI wired, click-through pending) | src/retry.ts |
| REQ-GEN-006 | Content-policy terminal failure mapping | P2 | DONE | INV-GEN-006 | tests/provider-path.int.spec.ts | src/provider.ts, src/executor.ts |
| REQ-GEN-007 | Model routing from versioned config | P1 | DONE | BR-GEN-001 | tests/cost-routing.spec.ts | src/routing.ts |
| REQ-GEN-008 | Frame requests produce n candidates | P2 | DONE | BR-GEN-002 | libs/stb/tests/frame-batch.int.spec.ts + browser E2E | stb service requestFrameBatch, generateFrameAction, lane button label |
| REQ-GEN-009 | Frame-conditioned takes (start-frame attachment) | P4 | DONE | BR-GEN-003 (frame arm) | tests/frame-conditioned.int.spec.ts + real ring + browser | src/service.ts, src/executor.ts, ../stb/src/service.ts |
| REQ-GEN-010 | Provider abstraction: real path → storage → ready | P1 | DONE | BR-GEN-004 | tests/provider-path.int.spec.ts | src/provider.ts, src/executor.ts |
| REQ-GEN-011 | Per-org video concurrency cap | P2 | DONE | BR-GEN-005 | tests/concurrency.int.spec.ts | src/executor.ts |
| REQ-GEN-012 | image_edit: instruction + source → new asset with lineage | P4 | DONE | BR-GEN-006, BR-AST-005, INV-AST-001 | tests/image-edit.int.spec.ts + real ring + browser | src/prompt.ts, src/service.ts, src/executor.ts, ../ast/src/entities.ts |
| REQ-GEN-013 | Deterministic prompt assembly, snapshotted | P1 | DONE | `docs/14` §5 | tests/prompt.spec.ts | src/prompt.ts |
| REQ-GEN-015 | Mock executor (MOCK_GEN) returns fixture media | P1 | DONE | `docs/82` §5 (enabler) | tests/pipeline.int.spec.ts | src/executor.ts, src/service.ts |
| REQ-GEN-017 | Live progress reaches the UI (SSE) | P2 | DONE | `docs/07` §1, ADR-006 (enabler) | libs/prj/tests/activity.int.spec.ts + browser E2E | libs/prj/src/activity.ts, apps/web (events route, LiveRefresh) |
| REQ-GEN-016 | Jobs execute via queue worker (pg-boss) | P2 | DONE | `docs/03` §1–2 (enabler) | apps/worker/tests/handlers.int.spec.ts + browser E2E | apps/worker/src/*, libs/shared/src/queue.ts |
| REQ-GEN-019 | Lyria music generation (brief → real track) | P5 | DONE | USER 2026-07-23; docs/85 §Music | libs/stb/tests/music-track.int.spec.ts + real E2E ($0.08) | migration 0017, provider generateMusic (Interactions REST), executor music branch, requestMusicTrack, ♫ UI |
| REQ-GEN-020 | Audio transcription MM:SS (sync) | P5 | DONE | USER 2026-07-23; docs/85 §Music | libs/stb/tests/transcript.int.spec.ts + real E2E | migration 0019, provider audio parts, executor ref fetch, requestTranscript, ⏱ UI |
| REQ-GEN-021 | Dialogue captions (transcribe the export's own audio) | P7 | DONE | eval #6 finding | asm/tests/dialogue-captions.int.spec.ts + real E2E frame | gen/transcribe.ts, asm captionSource pipeline, captions select UI |
| REQ-GEN-022 | Stale-running reaper (orphan crash recovery) | P5 | DONE | console-sweep finding: 5h-stuck take on user's project | tests/reaper.int.spec.ts + real orphan reaped | executor reapStaleGenerations (claim-time), config staleRunningMinutes |
| REQ-GEN-023 | Omni video take route (refs + free durations) | P6 | DONE | OQ-112 spike 2026-07-24 | tests/omni-video.spec.ts + real E2E (RUN_REAL_OMNI, 5s take $0.5068) | provider buildOmniVideoRequest + interactions path, routing videoRoute, cost token rate, executor refs |
| REQ-GEN-034 | Stuck work recovers: queued rows nothing will claim, and cancel | P9 | DONE | USER 2026-07-27 "2 (video) and 3 (image) are stuck… how to restart?" | tests/stuck-recovery.int.spec.ts (8) | executor reapStale queued branch + cancelGeneration, in-flight panel |
| REQ-GEN-032 | One prompt pipeline; golden-file tests on assembled output | P10 | DONE | `docs/88-architecture-review.md` §2 · four shipped defects | tests/prompt-pipeline.spec.ts (12) + prompt-golden.spec.ts (5) | src/prompt.ts (subjectStage/lookStages/soundStages/assemble) |
| REQ-GEN-033 | Lint + config hardening: no-dupe-keys, derived vocabularies | P10 | PROPOSED | `docs/88-architecture-review.md` §5 | — | — |
| REQ-GEN-031 | Filmed prompts carry no typography and forbid on-screen text | P9 | DONE | USER 2026-07-27 "where these gibberish texts in middle of video come from?" | prompt.spec.ts REQ-GEN-031 (4) + style-card.spec.ts (4) | style-card toVisualStyle, prompt.ts NO_ON_SCREEN_TEXT |
| REQ-GEN-029 | Live refresh coalesced — SSE no longer races a form action's commit | P9 | DONE | USER 2026-07-27 runtime TypeError "fiber.reset is not a function" | apps/web/tests/refresh-coalesce.spec.ts (5) | apps/web/lib/coalesce.ts, LiveRefresh |
| REQ-GEN-028 | Spoken lines survive from script to video model | P9 | DONE | USER 2026-07-27 "Pasi is talking something… in video prompt all of that is missing" | tests/prompt.spec.ts REQ-GEN-028 (7) | prompt.ts dialogue in plan schema + custom-prompt path |
| REQ-GEN-027 | Stuck runs recover on page load, and failed pictures are visible | P9 | DONE | USER 2026-07-26 "two videos seem stuck" | tests/stale-sweep.int.spec.ts (5) | executor sweepStuckGenerations, page.tsx sweep + per-shot failure banner |
| REQ-GEN-026 | Card-driven prompts: the pipeline reads Style Cards, not prose recipes | P9 | DONE | EPIC-STB-001 SR-DIR-005 | tests/prompt.spec.ts REQ-GEN-026 (5) + style-card.spec.ts | src/prompt.ts (card look) · stb recipeFor · prj setProjectArchetype · web picker · archetypes.ts deleted |
| REQ-GEN-025 | Style-card compiler: free-form brief → craft primitives | P9 | DONE | EPIC-STB-001 SR-DIR-004 (USER 2026-07-26 "a 1-minute feature film … directed by Aki Kaurismäki, a bit humoristic") | tests/style-compiler.spec.ts (25) + 2 live grounded compiles | src/style-compiler.ts |
| REQ-GEN-024 | Web-grounded entity research (Google Search + URL context) | P8 | DONE | USER 2026-07-24 (with docs links) | tests/research.spec.ts + real LastBot verification | src/research.ts (tools: googleSearch+urlContext), researchEntityProfileAction, library ✦ button |
| REQ-GEN-018 | Race-safe claim across parallel workers | P5 | DONE | `docs/03` §2 (enabler) | tests/claim-race.int.spec.ts (2) | executor claimGeneration (conditional update) + loser-scans-on loop |

### REQ-GEN-016 — Jobs execute via queue worker (pg-boss)
- **Status:** DONE · **Stage:** P2 · **Priority:** must (enabler)
- **Source:** `docs/03` §1–2, ADR-002
- **Statement:** Generations and exports run in `apps/worker` via pg-boss jobs (`gen-execute`, `asm-export`) addressed by row id; the web tier enqueues and never blocks on model/ffmpeg work. Dev fallback: `WORKER_MODE=inline` keeps single-process ergonomics.
- **Acceptance criteria:**
  - GIVEN a queued pg-boss `gen-execute` job WHEN the worker handler runs THEN the generation succeeds and its STB candidate is materialized.
  - GIVEN queue mode WHEN the UI requests a frame THEN the browser sees the candidate after the worker processes it (browser evidence).
- **Tests:** `apps/worker/tests/handlers.int.spec.ts` + browser E2E · **Code:** `apps/worker/src/*`, `libs/shared/src/queue.ts` · **Log:** LOG 2026-07-23 (slice 3)

### REQ-GEN-017 — Live progress reaches the UI (SSE)
- **Status:** DONE · **Stage:** P2 · **Priority:** must (enabler)
- **Source:** `docs/07` §1 realtime, `docs/41` §3, ADR-006
- **Statement:** `GET /api/projects/{id}/events` streams SSE; the client refreshes project views on events, so worker results appear without manual reload. MVP transport: DB activity-fingerprint poll-bridge behind the SSE contract; outbox push replaces the bridge later (deferral logged).
- **Acceptance criteria:**
  - GIVEN a project WHEN a generation completes THEN the activity fingerprint changes (integration-tested).
  - GIVEN the storyboard open in queue mode WHEN the worker finishes a take THEN the take appears without manual reload (browser evidence).
- **Tests:** `libs/prj/tests/activity.int.spec.ts` + browser E2E · **Code:** `libs/prj/src/activity.ts`, `apps/web/app/api/projects/[id]/events/route.ts`, `apps/web/components/LiveRefresh.tsx` · **Log:** LOG 2026-07-23 (slice 4)

### REQ-GEN-018 — Race-safe claim across parallel workers
- **Status:** DONE · **Stage:** P5 · **Source:** `docs/03` §2 (enabler) — discovered during REQ-GEN-011
- **Statement:** Claiming a queued generation is atomic: `claimGeneration` flips queued→running via conditional UPDATE (`WHERE status='queued'` + RETURNING) and reports the winner; losers scan on to the next queued row. A row can never be executed (and billed) twice however many runners race.
- **Acceptance criteria:**
  - GIVEN 4 concurrent claims on one queued row THEN exactly one wins; a later claim on the running row returns false (deterministic int test).
  - GIVEN concurrent runNextGeneration calls THEN exactly one provider execution and the row ends succeeded (canary int test).
- **Tests:** `tests/claim-race.int.spec.ts` · **Code:** `src/executor.ts` claimGeneration + scan-on loop · **Log:** LOG 2026-07-24
- **Deferred / notes:** BR-GEN-005 slot check remains read-then-check — worst case briefly exceeds the video cap by (racers−1); harmless (cost cap still enforced at enqueue) and self-corrects; revisit with FOR UPDATE SKIP LOCKED if worker fleets grow.

*(REQ-GEN-014 reserved for event emission — folded into 001/003 acceptance for now; split if it grows.)*

---

### REQ-GEN-001 — Provenance recorded before execution
- **Status:** DONE · **Stage:** P1 · **Priority:** must · **Owner:** —
- **Raised-by:** seeded from `docs/14-generation.md` (Prompt 1)
- **Source:** INV-GEN-001
- **Statement:** Before any model call executes, the generation row persists model id, assembled prompt snapshot, params, reference asset ids, requesting principal, and target.
- **Acceptance criteria:**
  - GIVEN a take request WHEN enqueued THEN a `gen.generation` row exists with status `queued`, model id from config, full prompt snapshot, and target (shot id) — before the executor runs.
  - GIVEN the executor crashes before completion THEN the row still holds the full snapshot (provenance survives failure).
- **Tests:** `tests/pipeline.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-002 — Outputs are new immutable assets
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-GEN-002
- **Statement:** A completed generation writes its output as a new `ast.asset` row (+ storage object) and never mutates an existing asset.
- **Acceptance criteria:**
  - GIVEN a completed frame generation THEN a new asset row exists with `generation_id` set and status `ready`.
  - GIVEN a regeneration for the same shot/slot THEN a second asset exists; the first is untouched.
- **Tests:** `tests/pipeline.int.spec.ts` · **Code:** `src/executor.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-003 — Cost recorded on completion
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-GEN-003
- **Statement:** On completion the generation row records actual cost in USD (video: duration × per-second rate; image: per-image rate from the price table).
- **Acceptance criteria:**
  - GIVEN a completed 6.5s take THEN `cost_usd = 0.65` (from `priceTable.videoPerSecondUsd`).
  - GIVEN a failed generation THEN `cost_usd` reflects what the provider charged (0 for pre-execution failures).
- **Tests:** `tests/cost-routing.spec.ts, tests/pipeline.int.spec.ts` · **Code:** `src/cost.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-004 — Daily per-org spend cap at enqueue
- **Status:** DONE · **Stage:** P5 · **Priority:** must · **Owner:** —
- **Raised-by:** BACKLOG priority raise once real mode went live (every take bills real money)
- **Source:** INV-GEN-004
- **Statement:** Enqueue shall reject new generations once the organization's billed spend today (succeeded+running, UTC day) reaches `config.gen.quota.dailyUsdPerOrg` (env-overridable via GEN_DAILY_USD_CAP); rejections are recorded as failed generations with `quota_exceeded` and never reach a provider.
- **Acceptance criteria:**
  - GIVEN spend under the cap WHEN enqueue THEN row is queued as normal.
  - GIVEN spend at/over the cap WHEN enqueue THEN row inserted failed with `quota_exceeded`, cost NULL, no provider call.
- **Tests:** `tests/quota.int.spec.ts` · **Code:** `src/service.ts` (enqueueGeneration), `libs/shared/src/config/limits.ts` (config.gen.quota) · **Log:** LOG 2026-07-23
- **Deferred / notes:** decided against a separate PLT quota aggregate — the generation table is the billing source of truth (INV-PRJ-004 precedent). Browser-verified with GEN_DAILY_USD_CAP=0.01: UI shows failed · quota_exceeded, $—.

### REQ-GEN-005 — Retry of terminal failures (retry_of provenance)
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Source:** INV-GEN-005
- **Statement:** A terminally failed generation can be retried: a NEW generation row is created copying kind/target/snapshot/params/refs with `retry_of` = source; the failed row is never mutated. Retrying non-failed generations is rejected.
- **Acceptance criteria:**
  - GIVEN a failed generation WHEN retried THEN a new queued row exists with retry_of=source and identical snapshot; the source stays failed.
  - GIVEN a succeeded/queued generation WHEN retried THEN rejected `conflict`.
  - Browser: a failed row in RECENT GENERATIONS offers ↻ retry and the retried work lands.

### REQ-GEN-006 — Content-policy terminal failure mapping
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Source:** INV-GEN-006, `docs/14` §6
- **Acceptance criteria:**
  - GIVEN the provider raises a content-policy rejection WHEN executing THEN the generation is terminal `failed` with `error_code = content_policy`, no asset is created, and it is never auto-retried.

### REQ-GEN-007 — Model routing from versioned config
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** BR-GEN-001
- **Statement:** Kind → model resolution comes exclusively from `@avd/shared/config` model routes; no model id literals elsewhere.
- **Acceptance criteria:**
  - GIVEN kind `take` THEN resolved model is `modelRoutes.take`; GIVEN kind `frame` quality `draft` THEN `modelRoutes.frame.draft`.
  - GIVEN a repo-wide grep for `gemini-` outside `libs/shared/src/config` THEN zero hits (test enforced).
- **Tests:** `tests/cost-routing.spec.ts` · **Code:** `src/routing.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-008 — Frame requests produce n candidates
- **Status:** DONE · **Stage:** P2 · **Source:** BR-GEN-002 — default `config.frame.candidatesDefault`, max `candidatesMax`.
- **Tests:** `libs/stb/tests/frame-batch.int.spec.ts` + browser E2E · **Code:** stb requestFrameBatch, generateFrameAction · **Log:** LOG 2026-07-23 (stale stub reconciled 2026-07-24 — block predated the build and skipped the IN_REVIEW sweep)

### REQ-GEN-009 — Frame-conditioned takes (start-frame attachment)
- **Status:** DONE · **Stage:** P4 · **Priority:** must
- **Source:** BR-GEN-003 (frame arm; entity/style ref arms follow with the entity library), BR-STB-002
- **Statement:** When a shot has a selected start frame, RequestTake records the frame's asset id in the generation's provenance refs and the executor fetches its bytes and passes them to the provider (`image` param — verified by OQ-101 spike). Without a selection, takes remain text-to-video.
- **Acceptance criteria:**
  - GIVEN a shot with a selected start frame WHEN a take executes THEN the provider receives startFrame bytes/mime matching the stored asset (stub-verified) and the generation's refs record the asset id.
  - GIVEN no selected frame THEN the provider receives no startFrame.
  - Real ring: image → frame-conditioned take chain passes (RUN_REAL_VIDEO).

### REQ-GEN-010 — Provider abstraction: real path → storage → ready
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** BR-GEN-004
- **Statement:** The executor calls a `GenProvider` port (mock, stub, or Gemini); provider media bytes land in object storage as ready assets with billed cost from the price table. The concrete Omni video adapter ships after the OQ-101/102 paid spike; Gemini text+image adapters ship now.
- **Acceptance criteria:**
  - GIVEN a stub provider WHEN a frame executes THEN its bytes are stored, asset `ready`, cost = image price (billed).
  - GIVEN a stub provider returning a 6.5s video THEN cost_usd = 0.65 and the asset carries the returned duration.
  - GIVEN no provider override THEN MOCK_GEN=1 selects the mock provider; otherwise the Gemini adapter (requires GEMINI_API_KEY).

### REQ-GEN-011 — Per-org video concurrency cap
- **Status:** DONE · **Stage:** P2 · **Priority:** must · **Owner:** —
- **Raised-by:** seeded from `docs/14-generation.md` (Prompt 1)
- **Source:** BR-GEN-005 (`docs/14` §4: per-org video concurrency capped at `config.gen.maxConcurrentVideoPerOrg`, default 3; excess queues FIFO)
- **Statement:** The executor shall not start a `take`/`retake` generation for an org that already has `config.gen.maxConcurrentVideoPerOrg` video generations in status `running`; capped video jobs stay `queued` (FIFO) and are claimed on a later dispatch once a slot frees. Non-video kinds are never blocked by the video cap.
- **Acceptance criteria:**
  - GIVEN an org with `maxConcurrentVideoPerOrg` running take/retake generations WHEN `runNextGeneration(org)` is called for a queued take THEN it returns `null` and the take stays `queued`.
  - GIVEN the same capped org WHEN a `frame` generation is queued THEN `runNextGeneration(org)` claims and completes it (non-video kinds unaffected).
  - GIVEN the same capped org WHEN `runGenerationById` targets the queued take THEN it returns `null` and the row stays `queued` (worker retry/backoff or a later dispatch picks it up).
  - GIVEN one running video finishes (status `succeeded`) WHEN `runNextGeneration(org)` runs again THEN the oldest queued take is claimed (FIFO).
- **Tests:** `tests/concurrency.int.spec.ts` · **Code:** `src/executor.ts` (`videoSlotAvailable`, // BR-GEN-005)
- **Log:** LOG 2026-07-23 (concurrency slice)
- **Deferred / notes:** cap value exclusively from `@avd/shared/config` (`config.gen.maxConcurrentVideoPerOrg`), never a literal.

### REQ-GEN-012 — image_edit: instruction + source → new asset with lineage
- **Status:** DONE · **Stage:** P4 · **Priority:** must
- **Source:** BR-GEN-006, BR-AST-005, INV-AST-001
- **Statement:** An image_edit generation carries an instruction and a source asset; the provider receives the instruction prompt plus the source bytes; the output is a NEW ready asset with `edit_of` = source. The source is never mutated. Entity refs can be replaced with the edited result (count/validation preserved).
- **Acceptance criteria:**
  - GIVEN an image_edit WHEN executed THEN the provider prompt contains the instruction and the source bytes arrive as the first reference image (stub-verified).
  - GIVEN completion THEN a new asset exists with `edit_of` = source id; the source row/bytes are unchanged.
  - GIVEN an entity-ref replacement THEN the entity keeps 1–5 valid refs with the new asset swapped in.
  - Real ring: draft frame → edited variant with lineage (RUN_REAL_API).

### REQ-GEN-013 — Deterministic prompt assembly, snapshotted
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** `docs/14-generation.md` §5
- **Statement:** Prompt assembly per kind is a pure function of (project, shot, style kit, entities); the assembled prompt is stored verbatim on the generation row with `prompt_template_version`.
- **Acceptance criteria:**
  - GIVEN identical inputs THEN assembly output is byte-identical (golden-file test).
  - GIVEN a take request THEN the snapshot contains format, style, entity, shot, and audio blocks in documented order.
- **Tests:** `tests/prompt.spec.ts` · **Code:** `src/prompt.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-015 — Mock executor (MOCK_GEN) returns fixture media
- **Status:** DONE · **Stage:** P1 · **Priority:** must (enabler)
- **Source:** `docs/82-tech-stack.md` §5, `docs/03` §5
- **Statement:** With `MOCK_GEN=1`, the executor completes generations with fixture assets (image/video/audio/text) at zero provider cost, exercising the full queue → execute → asset → complete path.
- **Acceptance criteria:**
  - GIVEN MOCK_GEN=1 and a queued frame generation WHEN the worker runs THEN the generation succeeds with a fixture image asset and `cost_usd = 0`.
  - GIVEN MOCK_GEN unset and no `GEMINI_API_KEY` THEN enqueue fails fast with a clear config error.
- **Tests:** `tests/pipeline.int.spec.ts` · **Code:** `src/executor.ts, src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-GEN-019 — Lyria music generation
- **Status:** DONE · **Stage:** P5 · **Priority:** must · **Owner:** —
- **Raised-by:** USER 2026-07-23 (Lyria epic)
- **Source:** docs/85 §Music; OQ-114 RESOLVED: clip $0.04/song, pro $0.08/song (pricing page)
- **Statement:** One click runs the music brief (incl. lyrics) verbatim against `lyria-3-pro-preview` via the Interactions REST API; the returned MP3 becomes a ready audio asset attached as the project's active track (alternative to the manual Suno round-trip); cost $0.08/track from the price table.
- **Acceptance criteria:**
  - GIVEN a brief WHEN requestMusicTrack THEN kind `music` enqueued with the brief text verbatim and the configured Lyria route.
  - GIVEN execution THEN a ready `audio` asset exists and the brief's activeTrackAssetId points at it; mock bills $0; real bills $0.08.
  - GIVEN no brief THEN rejected `not_found`.
- **Tests:** `libs/stb/tests/music-track.int.spec.ts` (mock ring) + real browser E2E (Aurora: 3.9MB MP3 generated, attached, serving; billed $0.08) · **Code:** migration 0017 (kind), config route+price, provider.generateMusic (Interactions REST), executor music branch, STB requestMusicTrack/materialize attach, ♫ button · **Log:** LOG 2026-07-23
- **Deferred / notes:** ALSO this slice — Veo price corrected to $0.10/s (720p, pricing page 2026-07-23; was $0.15 overestimate; tests cascaded). Lyria clip model unused for now (pro covers the need).

### REQ-GEN-020 — Audio transcription with timestamps
- **Status:** DONE · **Stage:** P5 · **Priority:** should · **Owner:** —
- **Raised-by:** USER 2026-07-23 (Lyria epic — "time the change of scene according to song timing lyrics")
- **Source:** docs/85 §Music (gemini-3.6-flash audio understanding, inline ≤20MB)
- **Statement:** The attached music track can be transcribed into [MM:SS]-timestamped lines — lyrics per line for vocal tracks, labeled sections ([Verse]/[Chorus]) for instrumentals — stored on the music brief and shown on the script page; audio travels as a generation ref (audioAssetId) with full provenance.
- **Acceptance criteria:**
  - GIVEN an attached track WHEN transcribed THEN kind `transcript` with the audio ref in the snapshot; output lands in music_brief.transcript with MM:SS stamps.
  - GIVEN no track THEN rejected `not_found`.
- **Tests:** `libs/stb/tests/transcript.int.spec.ts` (mock audio part path) + real E2E (Aurora's 2:41 Lyria track → section structure 00:00 Intro … 02:32 Outro, visible in UI) · **Code:** migration 0019, provider inlineData audio parts, executor audio-ref fetch, STB requestTranscript/materialize, ⏱ Transcribe + transcript block · **Log:** LOG 2026-07-23
- **Deferred / notes:** consuming the timestamps (lyric-synced cut suggestions, ANM-003 caption overlays) is the next epic slice; diarization prompt-ready but unexercised (no multi-voice tracks yet).

### REQ-GEN-021 — Dialogue captions
- **Status:** DONE · **Stage:** P7 · **Priority:** should · **Owner:** —
- **Raised-by:** eval #6 — the character-story recipe's "captions for dialogue" was unimplementable with music-transcript captions
- **Source:** docs/85 §Music (audio understanding); docs/87 character-story recipe
- **Statement:** Exports may burn DIALOGUE captions: the pipeline extracts the assembled cut's own audio, transcribes spoken lines to [MM:SS] (speakers noted, music/SFX ignored, NO_SPEECH → skip), and burns them via the existing SRT path; caption source (off/lyrics/dialogue) chosen per export and captured immutably in the snapshot.
- **Acceptance criteria:**
  - GIVEN captions=dialogue WHEN exported THEN the cut's spoken words appear as captions at their timestamps (real E2E frame-verified: the whisper "We're really doing this." on screen at the spoken moment).
  - GIVEN mock mode THEN the fixture speech path exercises the chain; GIVEN no speech THEN captions skip cleanly.
  - GIVEN captions=lyrics THEN prior REQ-ASM-009 behavior unchanged.
- **Tests:** `libs/asm/tests/dialogue-captions.int.spec.ts` (mock ring) + real E2E on "The First Customer" · **Code:** `libs/gen/src/transcribe.ts`, ASM captionSource pipeline (audio extract → transcribe → SRT), captions select on both export forms · **Log:** LOG 2026-07-23 (slice 35)
- **Deferred / notes:** speaker-colored captions and singing-character lip-timing later; asm→gen dependency added (GEN is the provider gateway — architecturally clean).

### REQ-GEN-022 — Stale-running reaper
- **Status:** DONE · **Stage:** P5 · **Priority:** must · **Owner:** —
- **Raised-by:** health-sweep finding — a take stuck `running` 5h on the user's project (executor died in a dev-server restart), occupying a video-concurrency slot and spinning in the UI forever
- **Source:** BR-GEN-005 (slots must free), operational hardening
- **Statement:** Rows in `running` longer than `config.gen.staleRunningMinutes` (30) are failed with `orphaned` + a retry-suggesting message; the reaper runs at claim time (runNextGeneration) so recovery needs no separate scheduler; fresh running and queued rows are untouched.
- **Acceptance criteria:**
  - GIVEN a 2h-old running row THEN reaped to failed/orphaned; GIVEN fresh running or queued THEN untouched (red-first test).
  - GIVEN the real 5h orphan THEN reaped via the shipped function (verified: failed/orphaned; retry button now shows on the user's project).
- **Tests:** `tests/reaper.int.spec.ts` · **Code:** `src/executor.ts` reapStaleGenerations + claim-time call, config.gen.staleRunningMinutes · **Log:** LOG 2026-07-23
- **Deferred / notes:** provider-side cancel (Veo operation abort) not attempted — the operation may still complete server-side and bill; acceptable at current scale.

### REQ-GEN-023 — Omni video take route (references + free durations)
- **Status:** DONE  ·  **Stage:** P6  ·  **Priority:** should  ·  **Owner:** —
- **Raised-by:** OQ-112 paid spike 2026-07-24 (user-approved budget)
- **Source:** docs/08 OQ-112 resolution; docs/85 §tags (<FIRST_FRAME>/<IMAGE_REF_N>)
- **Statement:** Takes may route to `gemini-omni-flash-preview` via the Interactions API as an alternative to Veo: entity refs as `<IMAGE_REF_N>` (subject consistency), start frame as `<FIRST_FRAME>`, free-form durations beyond {4,6,8}s, cost billed from video output tokens (5,792 tok/s × $17.50/M ≈ $0.101/s — parity with Veo fast). Route selected by `config.gen.videoRoute` (env `GEN_VIDEO_ROUTE=omni`), read at call time.
- **Acceptance criteria:**
  - GIVEN videoRoute=omni WHEN a take resolves its model THEN it is the omni Interactions model; veo remains the default (unit).
  - GIVEN a start frame and entity refs WHEN building the request THEN the frame is image 1 with `<FIRST_FRAME>` in the text and refs are `<IMAGE_REF_2..>` binding by position (unit).
  - GIVEN a 5s omni take through the real pipeline THEN it succeeds, keeps durationS=5 (no {4,6,8} snap), and records cost 5×5792×$17.50/M ≈ $0.5068 (real E2E, RUN_REAL_OMNI).
- **Tests:** `tests/omni-video.spec.ts` (7) · real E2E `tests/real-api.e2e.spec.ts` RUN_REAL_OMNI ($0.5068 verified) · **Code:** `src/provider.ts` (buildOmniVideoRequest + interactions branch), `src/routing.ts`, `src/cost.ts`, `src/executor.ts` (refs + model cost), shared config (omniVideoModel, priceTable omni rates, gen.videoRoute) · **Log:** LOG 2026-07-24
- **Deferred / notes:** STB still snaps shot durations to {4,6,8} at plan level — exposing free durations (9–10s shots) in the UI is a follow-up STB slice. Conversational multi-turn retake untested. No UI switch — route is config/env by design (taste iteration without deploy, Tips #5).

### REQ-GEN-034 — Stuck work recovers: queued rows nothing will claim, and cancel
- **Status:** DONE · **Stage:** P9 · **Priority:** must
- **Raised-by:** USER 2026-07-27: "some problems in error handling of image and video generation, seems 2 (video) and 3 (image) are stuck and not completing, how to restart?" — a take `running` 7 minutes and a frame `queued` 7 minutes, with no way out of either.
- **Statement:** Work that will never finish shall be recoverable, and anything in flight shall be cancellable. Two holes: a `queued` row was never reaped on the reasoning "it never started, so it cannot be orphaned" — true in queue mode, FALSE inline, where generations run inside the request that created them and nothing ever consumes the queue; and there was no cancel at all, so a run under the 30-minute sweep window had no exit.
- **Acceptance criteria:**
  - GIVEN inline mode AND a `queued` row older than `config.gen.staleQueuedMinutes` THEN it is failed as `orphaned` with a message explaining that single-process mode abandoned it.
  - GIVEN a fresh queued row THEN it is left alone — it may be about to run.
  - GIVEN QUEUE mode THEN a queued row is NEVER reaped however old: pg-boss owns it, and reaping would fight the worker.
  - GIVEN a stale `running` row THEN it is reaped in either mode, unchanged.
  - GIVEN a running or queued row THEN `cancelGeneration` fails it as `cancelled`, sets `finishedAt`, frees the concurrency slot, and returns `true`; a second call returns `false` rather than claiming a cancellation that did not happen.
  - GIVEN a cancelled row THEN its message differs from an orphaned one — a choice and a crash must not read alike.
  - GIVEN a shot with work in flight THEN the workspace shows what is running, for how long, warns past 3 minutes, and offers cancel.
- **Tests:** `tests/stuck-recovery.int.spec.ts` (8)
- **Code:** `src/executor.ts` (`reapStale` queued branch, `cancelGeneration`) · `libs/shared/src/config/limits.ts` (`staleQueuedMinutes`) · `apps/web/app/actions.ts` (`cancelGenerationAction`) · `apps/web/app/p/[id]/page.tsx` (in-flight panel)
- **Log:** see LOG 2026-07-27
- **Deferred / notes:** cancelling marks the ROW cancelled; it cannot stop an HTTP request already in flight at the provider, so a late response is discarded rather than aborted. The deeper fix is `WORKER_MODE=queue` in dev (ADR-002 consequences) — this makes inline survivable, not correct. **Reversal recorded:** `tests/stale-sweep.int.spec.ts` asserted "queued cannot be orphaned"; it now asserts that for queue mode only.

### REQ-GEN-032 — One prompt pipeline; golden-file tests on assembled output
- **Status:** DONE · **Stage:** P10 · **Priority:** must
- **Raised-by:** `docs/88-architecture-review.md` §2 — `assembleTakePrompt`/`assembleFramePrompt` return early on `customPrompt`, and the planner writes one for every shot, so the composed branch carrying the craft and safety rails never executes in a real film.
- **Statement:** Visual prompt assembly shall have ONE path. A custom prompt shall substitute the subject stage only; look, continuity, dialogue, rails and format shall append unconditionally. The assembled output of representative shots shall be asserted against committed golden files, so every prompt change is a reviewable diff.
- **Acceptance criteria:**
  - GIVEN a custom prompt THEN the assembled result still carries brand safety, on-screen-text suppression, the card look, continuity, any spoken line, and the format tail — verified by construction, not by a branch.
  - GIVEN a representative shot per kind (filmed, dialogue, sub-clip, portrait, scene plate) THEN its assembled prompt matches a committed golden file.
  - GIVEN a change to any rail THEN the golden files diff, and the diff is the review.
  - GIVEN the refactor THEN no existing prompt test changes meaning — behaviour is preserved, structure is not.
- **Tests:** `tests/prompt-pipeline.spec.ts` (12 — seven of them red against the old code) · `tests/prompt-golden.spec.ts` (5 golden files in `tests/__prompts__/`)
- **Code:** `src/prompt.ts` — `subjectStage`, `lookStages`, `soundStages`, `assemble`; both visual builders are now stage lists with no early return
- **Log:** see LOG 2026-07-27
- **Deferred / notes:** four shipped defects traced to the split (REQ-GEN-028, REQ-GEN-031, REQ-STB-044, and the reference leak fixed in REQ-STB-045). **Two deliberate behaviour changes**, both recorded: (a) planner-authored prompts now receive the composed format tail ("A cinematic 16:9 video clip, 6 seconds, natural motion.") rather than the terser custom one; (b) the v3 decision "guidelines only shape auto prompts" (USER 2026-07-23) is REVERSED for rails — the verbatim half stands, the rails now apply, and the reversal is recorded in the v3 test itself. `prompt.ts` went 262 → 278 lines while removing a whole branch, because the stages are now named and commented.

### REQ-GEN-033 — Lint + config hardening
- **Status:** PROPOSED · **Stage:** P10 · **Priority:** should
- **Raised-by:** `docs/88-architecture-review.md` §5 — three hazards the type system did not catch, each of which cost real debugging time.
- **Statement:** Classes of silent error that already occurred shall be made impossible: duplicate object keys in config, vocabulary lists copied instead of derived, and structurally-typed payloads passed whole where a field was meant.
- **Acceptance criteria:**
  - GIVEN a duplicated key in a config literal THEN lint fails (`no-dupe-keys`). Regression: `config.project` was declared twice and the later literal silently won, so every threshold read `undefined`.
  - GIVEN a vocabulary (entity kinds, shot sizes, templates) THEN exactly one `as const` defines it and all consumers derive from it. Regression: `casting.ts` held its own copy and returned `character` for `location`.
  - GIVEN `getObject` THEN callers cannot pass the whole `{ bytes, mime }` where bytes are meant without a type error. Regression: ffmpeg received the object and silently produced nothing.
- **Deferred / notes:** no behaviour change; each item is a guard against a defect that has already happened once.

### REQ-GEN-031 — Filmed prompts carry no typography and forbid on-screen text
- **Status:** DONE · **Stage:** P9 · **Priority:** must
- **Raised-by:** USER 2026-07-27, on a generated take of a CORRIDOR reading "The Luting an Dof" in yellow on navy: "I do not understand where these gibberish texts in middle of video come from?"
- **Statement:** A filmed frame or take shall never be asked for lettering. `toVisualStyle` fed the Style Card's `typography` axis into every filmed prompt, so a corridor prompt ended with "Minimalist centered mid-century sans-serif title text in bright mustard yellow rendered against solid dark navy background cards" — and the video model rendered exactly that, as pseudo-words. Typography describes GRAPHIC shots, rendered locally by Remotion where text is real text.
- **Acceptance criteria:**
  - GIVEN a card with typography THEN `toVisualStyle` excludes it, while camera, light, palette, performance and continuity survive.
  - GIVEN the same card THEN `toDirectingBlock` and `toPlanBias` still carry it — the planner needs it for graphic shots.
  - GIVEN a planner-authored (custom) frame or take prompt THEN it forbids on-screen text; the composed path always said this, but the custom path returned before it, and the planner writes a custom prompt for every shot.
  - GIVEN a shot with dialogue THEN the spoken line survives alongside the no-text rail — dialogue is heard, not written on screen.
- **Tests:** `tests/prompt.spec.ts` (REQ-GEN-031, 4) · `libs/shared/tests/style-card.spec.ts` (4)
- **Code:** `libs/shared/src/contracts/style-card.ts` (`toVisualStyle`) · `src/prompt.ts` (`NO_ON_SCREEN_TEXT` on both the custom and composed paths)
- **Log:** see LOG 2026-07-27
- **Deferred / notes:** takes already generated keep their old prompts — regenerate any shot showing lettering. The pipeline was contradicting itself: the composed path forbade on-screen text while the card demanded titles, and the more specific instruction won.

### REQ-GEN-029 — Live refresh coalesced so SSE cannot race a form action
- **Status:** DONE · **Stage:** P9 · **Priority:** must
- **Raised-by:** USER 2026-07-27: runtime `TypeError: fiber.reset is not a function`, thrown from react-dom's `recursivelyResetForms`; reproducing it also surfaced `Cannot read properties of null (reading 'removeChild')` from `commitDeletionEffectsOnFiber`.
- **Statement:** A live-update refresh shall not tear down the tree while React is committing a form action. `LiveRefresh` (REQ-GEN-017) called `router.refresh()` on EVERY SSE `changed` event, and a server action's own `revalidatePath` write emits one — so the refresh replaced the subtree at the moment React ran its post-action form-reset pass over the just-submitted form. React then found a host fiber flagged for form reset whose DOM node was no longer a form (`fiber.reset` undefined), and a deletion whose parent node was already detached.
- **Acceptance criteria:**
  - GIVEN a change event THEN no refresh fires synchronously with it.
  - GIVEN a quiet period THEN exactly one refresh fires.
  - GIVEN a burst of twelve events THEN one refresh, not twelve — a generation moving queued → running → succeeded is one re-render.
  - GIVEN a later change after things settle THEN it refreshes again.
  - GIVEN teardown with a refresh pending THEN it is cancelled, so an unmounted view never refreshes.
  - GIVEN a submit followed immediately by switching shots THEN neither error recurs.
- **Tests:** `apps/web/tests/refresh-coalesce.spec.ts` (5)
- **Code:** `apps/web/lib/coalesce.ts` (`createCoalescer`) · `apps/web/components/LiveRefresh.tsx` (coalesced + `startTransition`)
- **Log:** see LOG 2026-07-27
- **Deferred / notes:** 350ms is a judgement call — long enough for an action to commit, short enough to feel live. The refresh also runs inside `startTransition` so it is a non-urgent update and cannot pre-empt the action's commit. This is a pre-existing race in REQ-GEN-017, not a regression from the recent work, but the stage-panel keying (REQ-STB-045) makes remounts more frequent and so made it easier to hit.

### REQ-GEN-028 — Spoken lines survive from script to video model
- **Status:** DONE · **Stage:** P9 · **Priority:** must
- **Raised-by:** USER 2026-07-27: "video script still has no details in it, at original video I see Pasi is talking something ('follow the modern path'), but in video prompt all of that is missing."
- **Statement:** A line written in the script shall reach the video model. Two independent faults broke this: the shot-plan JSON shape never asked for `dialogue`, so the planner dropped every spoken line the script had written; and `assembleTakePrompt` returns early on a custom prompt, before the `Spoken line:` clause is added — and the planner writes a custom `videoPrompt` for every shot, so no line could reach the model by any path.
- **Acceptance criteria:**
  - GIVEN the shot-plan prompt THEN it requests `direction.dialogue` and demands the script's exact wording, with `""` for a silent shot.
  - GIVEN a custom video prompt AND a shot with dialogue THEN the assembled prompt carries both.
  - GIVEN a custom prompt that already quotes the line THEN it is not repeated.
  - GIVEN no dialogue THEN no `Spoken line` clause.
  - GIVEN the non-custom path THEN dialogue still reaches the prompt.
  - GIVEN a line that already ends in a full stop THEN the clause is not double-punctuated; GIVEN one that does not THEN the clause is closed.
- **Tests:** `tests/prompt.spec.ts` (REQ-GEN-028, 7)
- **Code:** `src/prompt.ts` (`dialogue` in the plan schema + guidance; `spokenLine()`; custom-prompt branch)
- **Log:** see LOG 2026-07-27
- **Deferred / notes:** existing shots keep their empty `dialogue` — a re-plan picks lines up, or REQ-STB-046's field sets one without discarding paid takes. Whether the omni route actually performs a spoken line is a separate question from whether it is asked to; this fixes the asking.

### REQ-GEN-027 — Stuck runs recover on page load, and failed pictures are visible
- **Status:** DONE · **Stage:** P9 · **Priority:** must
- **Raised-by:** USER 2026-07-26: "two videos seem stuck" — two takes sat `running` for 38 minutes, past the 30-minute stale window, with the rail spinning "working" and the stage spinning "generating video…".
- **Source:** extends REQ-GEN-022 (stale-running reaper); BR-GEN-005 (slots must free)
- **Statement:** A run orphaned mid-flight shall recover without the user dispatching new work, and a failed picture or video generation shall be visible on the shot it belongs to with a one-click retry.
- **Acceptance criteria:**
  - GIVEN a run older than `config.gen.staleRunningMinutes` THEN a sweep fails it as `orphaned` with a retry-suggesting detail and a `finishedAt`.
  - GIVEN a run in flight (2 minutes old) THEN it is untouched; GIVEN a `queued` row of any age THEN untouched — it never started, so it cannot be orphaned.
  - GIVEN a second sweep THEN it reaps nothing — safe to call on every page load.
  - GIVEN stuck runs filling the org's video concurrency THEN sweeping frees every slot (BR-GEN-005).
  - GIVEN a failed frame/take/retake/animation THEN the shot shows the failure and a retry, and an `orphaned` failure explains it was interrupted rather than rejected, and that nothing was charged.
- **Tests:** `tests/stale-sweep.int.spec.ts` (5)
- **Code:** `src/executor.ts` (`sweepStuckGenerations`) · `apps/web/app/p/[id]/page.tsx` (sweep on load, `failedByShot` banner with `retryGenerationAction`)
- **Log:** see LOG 2026-07-26
- **Deferred / notes:** the underlying fragility is inline dev mode — a generation runs inside the server action's request, so an aborted request (a reload mid-take, which is how these two died) leaves the row `running` until swept. `WORKER_MODE=queue` with `apps/worker` does not have this failure mode; the sweep makes inline mode survivable rather than fixing it.

### REQ-GEN-026 — Card-driven prompts: the pipeline reads Style Cards, not prose recipes
- **Status:** DONE · **Stage:** P9 · **Priority:** should
- **Raised-by:** EPIC-STB-001 SR-DIR-005 (TASK-DIR-004), following REQ-STB-042 and REQ-GEN-025.
- **Statement:** Every prompt the pipeline assembles shall derive from the project's Style Card rather than from hardcoded prose, and no visual prompt shall contain the reference the card was compiled from. `ArchetypeRecipe` and `archetypes.ts` are removed: the directing block, plan bias and music bias are now DERIVED (`toDirectingBlock`/`toPlanBias`/`toMusicBias`), so editing one axis of a card changes the prompts.
- **Acceptance criteria:**
  - GIVEN a card THEN `assembleFramePrompt` and `assembleTakePrompt` fold in its craft primitives (camera notes, light, palette prose, performance, typography).
  - GIVEN a card compiled from a real director THEN NEITHER visual prompt contains the reference name nor the raw brief — the epic's governing constraint, now enforced at the prompt boundary.
  - GIVEN a user's own custom prompt THEN it stays verbatim AND the card look is still applied, with the name still absent.
  - GIVEN no card THEN prompt assembly is unchanged.
  - GIVEN a card THEN the plan bias states the pacing window, shot-count hint, preferred framing, allowed movements, the refusals, and pins animation accent/background to the card palette (SR-DIR-007) so graphics match the footage.
  - GIVEN a card whose humour axis reads "None — …" THEN the music bias omits the register rather than instructing "Tone: None".
  - GIVEN the six seed keys THEN `setProjectArchetype` still applies each card's `defaults.audioMode` (REQ-STB-027 preserved).
- **Tests:** `tests/prompt.spec.ts` (REQ-GEN-026, 5) · `libs/shared/tests/style-card.spec.ts` (24)
- **Code:** `src/prompt.ts` (`card` input + `cardLook`) · `libs/stb/src/service.ts` (`recipeFor` derives) · `libs/prj/src/service.ts` (`setProjectArchetype`) · `apps/web/app/p/[id]/page.tsx` (picker) · `libs/shared/src/config/archetypes.ts` **deleted**
- **Log:** see LOG 2026-07-26
- **Deferred / notes:** the `card` input is plumbed through prompt assembly but the executor does not yet pass the project's card to frame/take generation, and compiled cards are still not persisted (SR-DIR-008) — so today only the six seeds are reachable, via the existing archetype picker. Animation renders still read accent/background from the plan rather than the card directly; the plan bias pins them, which closes SR-DIR-007 at the planning layer only.

### REQ-GEN-025 — Style-card compiler: free-form brief → craft primitives
- **Status:** DONE · **Stage:** P9 · **Priority:** should
- **Raised-by:** USER 2026-07-26: "Like saying I want a 1-minute feature film of ModernPath AI directed by Aki Kaurismäki, a bit humoristic." — EPIC-STB-001, SR-DIR-004 (SCN-DIR-001, SCN-DIR-002).
- **Source:** `epics/EPIC-STB-001-director-briefs.md`; grounding pattern REQ-GEN-024 (`src/research.ts`)
- **Statement:** A free-form creative brief shall compile into a validated Style Card (REQ-STB-042) using web-grounded research, and the reference it was compiled from shall not survive into any prompt. Research is the ONE moment a reference name is legitimately in play; afterwards the craft axes carry the intent, because providers filter or dilute named-artist prompts and a name averages to mush in an image model.
- **Acceptance criteria:**
  - GIVEN a brief THEN the prompt carries it verbatim, asks for grounded search on any named reference, demands craft primitives rather than the name, and asks for the refusals and the humour register.
  - GIVEN a response with markdown fences THEN it still parses; GIVEN prose that is not a card THEN it is rejected with an `output_unusable` provider error.
  - GIVEN a parsed card THEN `provenance` (brief + references) is set by US, never taken from the model's card body.
  - GIVEN a reference name left in a craft axis THEN it is scrubbed from every axis — including diacritic-dropped spellings ("Kaurismaki" for "Kaurismäki") and connective forms ("in the manner of X", "X-style") — while the surrounding craft description survives and no dangling connective or double space is left.
  - GIVEN a scrubbed card THEN neither `toDirectingBlock` nor `toVisualStyle` contains the name, end to end; the name remains in `provenance` for the UI.
  - GIVEN list fields returned as a joined string THEN they are split rather than rejected: `;`/`|`/newline always, and commas only for a single item over 60 chars (so "no zooms, ever" survives intact).
  - GIVEN the prompt THEN it states that references are artistic sources only and never the subject/brand of the video.
- **Tests:** `tests/style-compiler.spec.ts` (25)
- **Code:** `src/style-compiler.ts` (`assembleStyleCardPrompt`, `parseStyleCard`, `scrubReferences`, `compileStyleCard`)
- **Log:** see LOG 2026-07-26
- **Deferred / notes:** the compiler is not yet reachable from the UI and cards are not yet persisted (SR-DIR-008) — a brief compiles only in code. `MOCK_GEN` returns a fixed card so no test hits the provider. Real-ring evidence is two live grounded compiles (§9.8), each a single near-free text call with no generation-ledger row, matching the `research.ts` precedent.

### REQ-GEN-024 — Web-grounded entity research
- **Status:** DONE · **Stage:** P8 · **Priority:** should
- **Raised-by:** USER 2026-07-24: "generate it based on google search and url context" (ai.google.dev docs linked)
- **Statement:** `researchEntityProfile` calls the script model with the googleSearch + urlContext tools to produce a factual 150-250 word profile from the entity name and optional official URL; the library's "✦ Research from web" button saves it as the entity profile (REQ-AST-012). Direct helper, no ledger row (transcribe.ts pattern, near-free).
- **Acceptance criteria:**
  - GIVEN name+URL THEN the research prompt demands search+URL grounding, sized prose, and no speculation (unit).
  - GIVEN mock mode THEN a usable fixture profile returns without a key (unit).
  - GIVEN the real model THEN a grounded, accurate profile returns (verified 2026-07-24 on LastBot + lastbot.com — LastBot ONE, Switchbot, GDPR positioning all correct).
- **Tests:** `tests/research.spec.ts` + real verification · **Code:** `src/research.ts`, `apps/web` action + UI · **Log:** LOG 2026-07-24
- **Deferred / notes:** grounding citations not stored (profile is user-editable text); search-grounding billing has a free daily tier — revisit if usage grows.
