# Build Log — GEN (Generation)

## 2026-07-27 — REQ-GEN-032 one prompt pipeline (→ IN_REVIEW) · process manual updated
**Done:** Unified visual prompt assembly. Both builders opened with `if (customPrompt) return …`, and the planner authors a custom prompt for EVERY shot, so the composed branch holding the craft and safety rails never ran in a real film. Now a custom prompt substitutes the SUBJECT stage only (`subjectStage`), and look, sound, rails and format append unconditionally (`lookStages`, `soundStages`, `assemble`). Added five golden files under `tests/__prompts__/` capturing what the model actually receives.
**Decisions:** (1) Seven rails were genuinely missing from planner-authored prompts and are now present — the single-continuous-shot pin, the project STYLE KIT (a project-wide look that had never applied to a planned shot), sound design, the explicit silent default, reference-appearance preservation, and the product label-legibility rule. Each got a red test first. (2) **Reversal recorded:** the v3 decision "custom text is verbatim, guidelines only shape auto prompts" (USER 2026-07-23) is half-reversed. Verbatim stands and is still asserted; rails now apply. The old test asserted `not.toMatch(/single continuous shot/)` — I changed it deliberately, in place, with the evidence in a comment, rather than deleting a user-sourced decision quietly. (3) Format tails standardised on the composed wording; the two paths had drifted apart.
**Discovered:** my own two "red" tests were red for the wrong reasons — one asserted `/16:9 video, 6 seconds/`, the OLD custom-path tail, and passed only because the paths differed. Reading the failure rather than assuming it saved a wrong "fix" to working code. Recorded as a rule in `CLAUDE.md` §6.
**Follow-ups:** REQ-GEN-033 (lint/config hardening), REQ-STB-059/060/061 remain PROPOSED.
**Gate:** 17 new tests (7 red first); full suite 482 passed / 14 skipped, with only the known `ast/derivatives` docker flake; tsc clean. Golden files verified by eye: every rail present, no reference name, no typography in any of the five.

## 2026-07-27 — process manual: assert the output, one path per pipeline
**Done:** `CLAUDE.md` updated from the review's findings rather than left as a document. Three new non-negotiables (§1.9 assert the OUTPUT not the wiring, §1.10 one path per pipeline, §1.11 vocabularies derived never copied); a new loop step 4b LOOK between GATE and TRACE; a new §6B "What to Test, and Where" with the five-layer table and the flake-under-load protocol; a new §10B "Code Shape" with the ~300-line signal; and a reporting rule in §11 requiring that "tests pass" and "I looked at it" be stated as the distinct claims they are.
**Decisions:** every added rule cites the specific failure that motivated it. A process manual full of unattributed good advice gets skimmed; one where each line names the bug it prevents gets followed.
**Gate:** documentation only.


## 2026-07-27 — REQ-GEN-031 filmed prompts carry no typography (→ IN_REVIEW)
**Done:** USER on a corridor take showing "The Luting an Dof": "where these gibberish texts in middle of video come from?" Read the actual stored prompt — it ended with "Minimalist centered mid-century sans-serif title text in bright mustard yellow rendered against solid dark navy background cards". `toVisualStyle` was feeding the card's TYPOGRAPHY axis into every filmed frame and take. The model was not hallucinating; it was obeying. Removed typography from the filmed look, and put the no-on-screen-text rail on the custom-prompt path.
**Decisions:** typography stays in `toDirectingBlock` and `toPlanBias`, because the planner genuinely needs it for GRAPHIC shots — those render locally through Remotion where text is real text rather than a diffusion model's impression of letters. The axis was never wrong; the audience for it was.
**Discovered:** the pipeline was contradicting itself. The composed take path has said "No on-screen text, timestamps, or interface graphics" since v3 — but the CUSTOM path returns before it, and the planner writes a custom prompt for every shot, so no filmed prompt in practice ever carried that rail. Two instructions, one forbidding text and one demanding a yellow title on navy, and the specific one won. Also kept the word "timestamps" in the new wording: an existing v3 test pins it, and it was there for a reason.
**Deferred:** takes already generated keep their old prompts — regenerate any shot showing lettering.
**Gate:** 8 new tests red-first; full suite 416 passed / 14 skipped / 0 failed; tsc clean. Re-assembled the user's real Corridor Standoff take prompt: the title-card sentence is gone and the prompt now forbids lettering outright.


## 2026-07-27 — REQ-GEN-029 live refresh coalesced (→ IN_REVIEW)
**Done:** USER hit `TypeError: fiber.reset is not a function`. Read the compiled react-dom: `recursivelyResetForms` calls `stateNode.reset()` on any host fiber carrying the FormReset flag, so React had flagged something that was no longer a `<form>`. Cause: `LiveRefresh` fired `router.refresh()` on EVERY SSE `changed` event, and a server action's own `revalidatePath` emits one — the refresh replaced the subtree while React was still committing the submitted action. Coalesced the refresh (350ms trailing) and moved it inside `startTransition`.
**Decisions:** coalescing rather than suppressing — a refresh must still happen, just after the commit settles; and it collapses a generation's queued → running → succeeded burst into one re-render instead of three. The debounce lives in a pure `createCoalescer` so the behaviour is unit-testable without a DOM or an EventSource.
**Discovered:** ruled out the obvious suspects first rather than guessing — no nested forms anywhere in the app (scripted the check across every component), no duplicate React copies (single 19.2.8 for both react and react-dom), and no invalid HTML nesting in the live DOM. That left the concurrent-update race, which the stack trace supports.
**Honest scope:** this is a pre-existing race in REQ-GEN-017, not a regression from this session's work — but REQ-STB-045's stage-panel keying makes remounts more frequent, so it became far easier to hit. The `removeChild` error had the same root and is also gone; I verified by submitting the prompts form repeatedly and by submitting then immediately switching shots mid-action, with the console cleared first so a stale entry could not be mistaken for a live one.
**Gate:** 5/5 `apps/web/tests/refresh-coalesce.spec.ts` (red first — module absent); 54/54 across the web + affected specs; tsc clean.


## 2026-07-27 — REQ-GEN-028 spoken lines survive from script to video model (→ IN_REVIEW)
**Done:** USER noticed the video prompt described Pasi speaking but never said WHAT. The drafted script had the lines ("The legacy code lacks discipline.", "We need structure.", "ModernPath. Production ready.") and all 11 shots stored `direction.dialogue` empty. Two independent faults, both fixed: the shot-plan JSON shape never asked for `dialogue`, and `assembleTakePrompt` short-circuits on a custom prompt BEFORE the `Spoken line:` clause — and the planner writes a custom videoPrompt for every shot, so the line could not reach the model by any path even when present.
**Decisions:** (1) The line is appended to a custom prompt rather than replacing it, and skipped when the prompt already quotes it, so nothing is said twice. (2) The plan guidance demands verbatim wording and `""` for silence, because a paraphrased line performed on camera is worse than none. (3) `spokenLine()` replaces `sentence()` for this clause — the quoted line brings its own full stop, and the old helper produced `Spoken line: "…discipline.".` on BOTH paths.
**Deferred:** whether the omni route actually performs the line is a separate question from whether it is asked to; this fixes the asking.
**Gate:** 41/41 `tests/prompt.spec.ts` (red first); 180 passed / 5 skipped across the affected suites; tsc clean. Live on the user's project: set the line on Pasi Close-Up and re-assembled its real take prompt — it now carries `Spoken line: "The legacy code lacks discipline."` alongside the planner's own text and the card's look.


## 2026-07-26 — REQ-GEN-027 stuck runs recover on page load (→ IN_REVIEW)
**Done:** USER: "two videos seem stuck." Two takes had been `running` for 38 minutes — past the 30-minute stale window — while the UI span "generating video…". REQ-GEN-022's reaper already handles exactly this, but it only ran inside `runNextGeneration`, i.e. when the user DISPATCHED NEW WORK. The person watching a stuck shot and waiting is precisely the one who never triggers that. Added `sweepStuckGenerations`, called on project page load, and a per-shot failure banner with a retry.
**Decisions:** (1) The sweep is deliberately the same reaper, not a second policy — one definition of "orphaned", one message. (2) It is safe on every page load because it only touches rows whose `startedAt` precedes the stale window, so work genuinely in flight is untouched; a test asserts a second sweep reaps nothing. (3) An `orphaned` failure gets its own wording — "interrupted before it finished… nothing was charged" — because "failed" reads as *rejected by the model* and would send the user editing a prompt that was fine.
**Discovered:** failed PICTURE and VIDEO generations were invisible. The failure banner queried `textKinds` only, so a failed take made a shot simply stop saying "working" and show nothing — no error, no retry, no explanation. That is why the user had no signal beyond a spinner.
**Deferred:** the real fragility is inline dev mode — a generation runs inside the server action's request, so an aborted request leaves the row `running`. My own repeated page reloads during their takes are the likely cause of these two. `WORKER_MODE=queue` with `apps/worker` does not have this failure mode; the sweep makes inline survivable rather than fixing it.
**Gate:** 5/5 `tests/stale-sweep.int.spec.ts` (red first — `sweepStuckGenerations is not a function`); 168 passed / 5 skipped across the affected suites; tsc clean. Live: reaped the user's two stuck takes (`failed`/`orphaned`), then confirmed in the browser that the Hallway shot now reads "take failed · orphaned" with "↻ Retry this take" and no longer claims to be working.


## 2026-07-26 — REQ-GEN-025 follow-up: the scrubber was eating the card's own vocabulary · `pnpm style`
**Done:** Added `pnpm style` (`scripts/style-card.ts`) so a director brief can be tried before the UI exists: compile a brief, inspect a seed card, or `--plan` to draft a shot plan from the card and run the director's pass over it. Exported `containsReference()` so any leak check uses the SAME rule as the scrubber and the two can never disagree.
**Decisions:** The script uses relative imports into `libs/`. Adding the workspace packages to the ROOT `package.json` made the script resolve cleanly but is reverted — a dev convenience is not worth touching how the whole repo resolves modules.
**Discovered (live, from a "shot like a David Attenborough nature documentary" brief):** the compiler returned references including **"Planet Earth"** and **"The Blue Planet"**, and `scrubText` split every reference into words and stripped each one over three characters — so the card's own `palette.notes` came back as *"Warm tones against a deep hour sky."* The scrubber was destroying the craft text it exists to protect. Fixed: the full reference phrase is always stripped, but single words are stripped only when they are distinctive, guarded by a common-word list (planet, earth, blue, natural, history, light, night, city, story…). A surname like "Kaurismäki" still goes; "earth tones" and "blue hour" stay. Found only because the script prints a name-exclusion check on real output — no unit test would have proposed a documentary reference.
**Follow-ups:** none for this slice.
**Gate:** 28/28 `tests/style-compiler.spec.ts` including three new cases for title-vs-surname stripping (red first — the over-strip case failed with the exact damaged string above); 117/117 across the epic's six unit specs; `npx tsc -p apps/web/tsconfig.json --noEmit` clean. NOT gated on the full suite this run: the machine is at load average ~100 (an unrelated Supabase stack pinning the Docker VM at ~600% CPU), so the Postgres-backed integration specs time out for environmental reasons; they passed at 287/287 before that load appeared and none of this slice touches them.


## 2026-07-26 — REQ-GEN-026 card-driven prompts · archetypes.ts deleted (TASK-DIR-004 → IN_REVIEW)
**Done:** The pipeline now reads Style Cards. `recipeFor()` (STB) derives the directing block, plan bias and music bias from the project's card instead of returning three hardcoded paragraphs; `setProjectArchetype` (PRJ) takes `defaults.audioMode` from the card; the web picker lists cards; and frame/take prompts fold in the card's craft primitives. `libs/shared/src/config/archetypes.ts` is deleted — the six recipes live on as seed cards under the same keys, so no project lost its selection.
**Decisions:** (1) The card look is pushed BEFORE the style-kit prompt in visual assembly, so a per-project style kit can still refine the card rather than being overridden by it. (2) A custom user prompt stays verbatim but still receives the card look — a user writing their own shot should not silently lose the film's style. (3) `toPlanBias` pins animation accent/background to the card palette, which is the planning-layer half of SR-DIR-007: graphics stop inventing per-shot hex that never matched the footage. (4) A humour axis reading "None — this style is sincere" is omitted from the music bias rather than rendered as the instruction "Tone: None" — caught by reading the actual generated output, not by a test.
**Deferred:** the executor does not yet pass the project card into frame/take generation, and compiled cards are not persisted (SR-DIR-008), so only the six seeds are reachable today. Animation renders still take colours from the plan rather than the card directly.
**Discovered:** one flaky failure in a single full-suite run (an ffmpeg/DB integration spec) that did not reproduce across three further runs and is unrelated to this change — noted rather than silently ignored.
**Follow-ups:** TASK-DIR-005 director's pass — the last task of the epic.
**Gate:** 30/30 `tests/prompt.spec.ts`, 24/24 `libs/shared/tests/style-card.spec.ts` (both red first); full suite 274 passed / 14 skipped / 0 failed; `npx tsc -p apps/web/tsconfig.json --noEmit` clean; no `archetypes` references remain outside prose. Verified by generating real output: the cinematic-mood card produced a plan bias pinning 8s shots, 4–6 shots, EWS/WS/MW framing, accent #e8b04b, and four explicit refusals, and its frame prompt carried the golden-hour look with no card metadata.


## 2026-07-26 — REQ-GEN-025 style-card compiler (TASK-DIR-003 → IN_REVIEW)
**Done:** Free-form intent now compiles into a validated Style Card via grounded search (the REQ-GEN-024 pattern pointed at a director instead of a company). `parseStyleCard` is pure so the whole contract is testable without a provider; `compileStyleCard` is the thin grounded call.
**Decisions:** (1) Provenance is set by US from the brief, never lifted from the model's own card body — the model does not get to decide what it was compiled from. (2) `scrubReferences` is defence in depth behind the prompt rail: the prompt says do not name the reference in the axes, and the scrubber assumes it will anyway, because "Kaurismäki-style framing" is exactly how a language model naturally writes. It strips connectives with the name so no dangling "in the manner of ." remains. (3) Malformed list shapes are split, not rejected — the content was right, only its shape was wrong, and failing a paid grounded call over a semicolon is poor economics.
**Deferred:** UI reachability and card persistence (SR-DIR-008) — a brief compiles in code only for now.
**Discovered (all three from the live ring, none reachable by unit test):** (a) the model returned `antiNotes` as ONE semicolon-joined string despite the JSON schema in the prompt — hence `coerceList`; (b) on the retry it returned all nine refusals as one COMMA-joined sentence, so the coercion comma-splits a single item over 60 chars while leaving "no zooms, ever" intact; (c) it listed **"ModernPath AI" among the references** — the subject of the film, not a style source. That was the dangerous one: scrubbing would then have stripped the user's own brand out of the craft axes, which BRAND_SAFETY explicitly permits them to name. Fixed in the prompt: references are artistic sources only, never the subject/brand. Also found the model drops diacritics ("Kaurismaki"), so the scrubber matches de-accented spellings too.
**Follow-ups:** TASK-DIR-004 card-driven prompts → TASK-DIR-005 director's pass.
**Gate:** 25/25 in `tests/style-compiler.spec.ts` (red first); full suite 263 passed / 14 skipped / 0 failed. Real ring (§9.8), two live grounded compiles of the user's brief, ~$0.002 each: first surfaced findings (a) and (c); after the fixes the second returned 5 separate refusals, references clean of the subject, and no name leak in either prompt block — the card researched Timo Salminen (the cinematographer) and three specific films unprompted.


## 2026-07-24 — BATCH SIGN-OFF: all IN_REVIEW → DONE (human-approved)
**Done:** USER approved the review queue verbatim: "approve all for now" (evidence: sign-off artifact + per-REQ tests/browser/real-API links in the ledger). All IN_REVIEW rows in this ledger moved to DONE atomically (dashboard row + detail block + Totals).
**Decisions:** approval is provisional ("for now") — regressions reopen the specific REQ, not the batch.
**Deferred / Discovered / Follow-ups:** none. **Gate:** ledger parse verified via scripts/progress.ts.

## 2026-07-24 — Production #2 "First Light, Helsinki Harbor" — omni route + music-first driver, end to end
**Done:** Driver restructured music-first (`draft`/`music`/`plan`/`sync`/`takes` + new `retry` stage) closing the BACKLOG ordering item. Full cinematic-mood production on `GEN_VIDEO_ROUTE=omni`: the plan authored 5s shots (REQ-STB-029 palette live on a real model), the `sync` stage stretched The Sleeping Icebreaker 5s→10s so its cut lands exactly on the track's 0:16 section change BEFORE takes were bought, and all 5 omni takes (6/10/6/5/8s) generated with token-exact costs ($0.6082/$1.0136/$0.6082/$0.5068/$0.8109). One transient Interactions 504 recovered via `retryGeneration` (retry_of provenance, failure uncharged). 35.02s export verified; beat review passed all six principles; the tram carries an invented "SUOMI LINJAT" livery — the brand-safety rail visibly steering real output.
**Decisions:** driver keeps env-based route selection (matches config philosophy).
**Deferred:** —.
**Discovered:** UI is not route-aware (a 10s omni shot's take button estimated $0.80 via the veo snap; active route invisible; dev-server/driver env split-brain) → BACKLOG.
**Follow-ups:** UI route-awareness slice.
**Gate:** suite + tsc green (below). Spend today ≈ $11.9 / $100.

## 2026-07-24 — REQ-GEN-023 Omni video take route (PROPOSED → IN_REVIEW)
**Done:** The Interactions video adapter is a first-class take route. Red-first (7 unit tests): `resolveModel` honors `config.gen.videoRoute` at call time (env `GEN_VIDEO_ROUTE=omni`; veo default); pure `buildOmniVideoRequest` puts the start frame as image 1 + `<FIRST_FRAME>` and entity refs as `<IMAGE_REF_2..>` binding by position, duration prompt-pinned free-form; cost = tokens×rate from the new priceTable primitives (5792 tok/s, $17.50/M). Executor passes entity refs to video on the omni route and the model id into cost. Real E2E (RUN_REAL_OMNI): draft frame → **5s** omni take through the full pipeline — a duration Veo rejects — asset durationS=5, cost $0.5068 exactly per the token math.
**Decisions:** no UI switch — route is config/env (Tips #5); mock provider untouched (already duration-honest).
**Deferred:** STB plan-level duration snap {4,6,8} still applies — 9–10s shots need an STB slice; conversational retake untested.
**Discovered:** none.
**Follow-ups:** consider omni as the retake route (its edit/conversation strengths) once multi-turn is spiked.
**Gate:** 147 passed, tsc clean. Spend today ≈ $7.9 / $100.

## 2026-07-24 — Brand-safety rail hardened to UNCONDITIONAL after reshoot still drew the Monster mark
**Done:** Validation reshoot of the hero shot FAILED — Monster claw again, plus the ref's burned timecode and color bars leaking into the scene. Prompt snapshot proved two guard gaps: (1) the shot's plan-authored image script is a `customPrompt`, which returned early and bypassed ALL v3 guidance; (2) the entity kind is `character`, so the product/company guard never fired. Fix (red-first, 21/21): BRAND_SAFETY appends unconditionally in `assembleFramePrompt`/`assembleTakePrompt` — custom prompts keep their verbatim body and gain only the safety rail. Also replaced the tainted hero scripts (claw-logo wording → original kaiju-dragon emblem, matching shot 1) via `updateShotScripts`, reshot ($0.67), verified clean (original dragon emblem, no timecode, no ref leakage), re-exported — final 30.02s cut's hero beat is now the best frame in the film. Driver gained a `reshoot <projectId> <shotTitle>` stage.
**Decisions:** safety rails may append to custom prompts; creative scaffolding may not (user verbatim control preserved — docs/85 §10 updated).
**Deferred:** entity data still placeholder (kind `character`, test-pattern ref with burned timecode) — user's call to replace; recommended: kind→product + real can design ref.
**Discovered:** ref-image pollution (timecode/color bars) propagates into generated scenes — placeholder refs are actively harmful, not just useless.
**Follow-ups:** none in-slice. **Gate:** full suite + tsc green. Spend today ≈ $7.2 / $100.

## 2026-07-24 — FULL-SCALE production run "KAIJU Neon Nights" + brand-safety guideline shipped
**Done:** First full-scale real production end-to-end via the new staged driver (`apps/web/scripts/production-run.ts` — keeper tool): brand-pulse archetype → script → 7-shot plan (2 free animation shots authored BY the plan) → 5 real frames → 5 frame-conditioned Veo takes (4/4/4/4/6s) → Lyria track → transcript → 30.02s export with music mix (h264+mp3, exactly on storyboard length). Browser-verified: 7/7 generated, spend meter $2.62 today/$100 cap, MUSIC SYNC live against the real transcript (suggested Hero Climax 6s→8s to land the 0:28 section change). Beat-frame taste review passed principles 1/2/4/6.
**Defect found+fixed (major):** hero shot rendered a REAL competitor logo (Monster claw) — the PLAN itself authored "black claw logo". Shipped brand-safety guideline in 3 prompts (plan always; frame/take on product/company cast) red-first in prompt.spec.ts; docs/85 §10. Trademark landmine closed at the source.
**Defect found+fixed (ANM):** kinetic words fused ("WAKETHECITY") — flex gap em was keyed to the 16px container, not the glyph size; fontSize moved to container. $0 render re-verified ("WAKE THE CITY" reads correctly).
**Deferred:** driver orders music AFTER takes, so sync suggestions arrive too late to shape durations — reorder (music-first like lyric-video) → BACKLOG. Hero-shot retake under the new guideline optional ($0.60).
**Discovered:** production project left LIVE (not archived) — it's a watchable deliverable for the user.
**Gate:** full suite + tsc + render ring green. Spend today ≈ $5.9 / $100.

## 2026-07-24 — OQ-112 Omni video spike RESOLVED + real-ring video E2E fixed (USER: $100/day test budget)
**Done:** (1) Daily cap 20→100 per USER directive. (2) Full real ring green 4/4 incl. the RUN_REAL_VIDEO frame-conditioned Veo take — found and fixed a stale $0.15/s price assertion in the gated test (missed by the 0.15→0.10 cascade because it never runs un-gated; now derives from `priceTable.videoPerSecondUsd`). (3) RUN_RENDER Remotion ring 4/4. (4) **OQ-112 spike executed (~$1.8):** Interactions API video works — `input:[{type:"image"...},{type:"text"...}]` + `response_format:{type:"video"}`, tags `<FIRST_FRAME>`/`<IMAGE_REF_N>` in prompt text bind to image blocks by position; first-frame lock verified against the source frame; reference fidelity striking (test-pattern ref wrapped exactly onto a photoreal can); duration free-form via prompt ("Duration: 10 seconds." → 10.01s); synchronous 22–31s; billing deterministic 5,792 video tok/s × $17.50/M ≈ $0.101/s (Veo-fast parity).
**Decisions:** Omni route is worth building for refs + free durations, not for cost — REQ-GEN-023 PROPOSED with draft acceptance criteria.
**Deferred:** conversational retake (multi-turn interaction) untested — fold into REQ-GEN-023 slice.
**Discovered:** entity "Pasi" ref asset id `019f9001-…` dangles (asset row missing, likely purge casualty) → BACKLOG.
**Follow-ups:** run a full-scale real production (script→plan→frames→takes→music→captions→export) under the new budget next tick.
**Gate:** pnpm test:real 4/4 · render ring 4/4 · spend today ≈ $3.2 / $100.

## 2026-07-23 — REQ-GEN-022 stale-running reaper (→ IN_REVIEW)
**Done:** console/health sweep found a take stuck `running` for 5h on the user's project (orphaned by a dev-server restart mid-execution) — occupying a BR-GEN-005 video slot and spinning in the UI. Red-first reapStaleGenerations (config 30min window, claim-time invocation, fresh/queued untouched); the real orphan reaped via the shipped function — now failed/orphaned with a retry hint visible in the UI.
**Decisions:** claim-time reaping (no scheduler needed); no provider-side cancel at this scale (noted).
**Deferred:** — **Discovered:** — **Follow-ups:** —
**Gate:** full suite green (134); tsc clean.

## 2026-07-23 — verification tick: rings green after label-guidance prompt change
**Done:** DoD §9.8 re-run after the frame-prompt change (label fidelity): real ring 3/3 (text, draft image full-pipeline, image edit with lineage — ≈$0.04); Remotion render ring 4/4 (title, alpha lower-third, effects, kinetic); full suite 133; web tsc clean. No drift.
**Decisions:** — **Deferred:** — **Discovered:** — **Follow-ups:** —
**Gate:** all rings green.

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

## 2026-07-24 — REQ-GEN-018 race-safe claim (PROPOSED → IN_REVIEW) — loop restarted on the ledger
**Done:** USER restarted the loop with "execute the requirements ledger"; with 0 READY, promoted the last buildable PROPOSED. `claimGeneration` makes the queued→running flip atomic (conditional UPDATE + RETURNING); processGenerationRow refuses to execute unless it won; runNextGeneration scans past lost rows. Red-first: naive Promise.all race did NOT reproduce (pool serialization masks the window — recorded as a weak canary and kept), so the deterministic test targets the primitive: 4 concurrent claims → exactly 1 winner, re-claim on running → false. 2/2 green.
**Decisions:** BR-GEN-005 slot check left read-then-check — bounded, harmless overshoot; noted in the ledger for a future FOR UPDATE SKIP LOCKED pass.
**Deferred:** — **Discovered:** — **Follow-ups:** —
**Gate:** 162 passed, tsc clean.
