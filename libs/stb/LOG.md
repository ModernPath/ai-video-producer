# Build Log — STB (Story & Storyboard)

## 2026-07-23 — slice 22: REQ-STB-025 ♪ MUSIC SYNC (→ IN_REVIEW) + subtext passthrough
**Done:** red-first music-sync module (parseSectionTimes from [MM:SS], greedy exact-hit duration suggestions over the allowed set with cascade-aware cursor); updateShotDuration (INV-STB-001); ♪ MUSIC SYNC storyboard panel with one-click apply + honest caveat (existing takes keep length; provenance badges mark stale). Browser E2E on Aurora: panel listed sections 0:19–2:32, proposed Momentum 6s→8s so cut 3 lands exactly on the 0:19 section change; applied, DB verified 8.0. Also closed REQ-STB-024's deferral: subtext (plan-authored or caller-provided) now flows into TitleCard renders.
**Decisions:** exact-hit only (no tolerance window) — simple, predictable; extend on demand.
**Deferred:** near-miss tolerance; auto-regenerate stale takes after sync.
**Discovered:** —
**Follow-ups:** —
**Gate:** full suite green (126 passed).

## 2026-07-23 — slice 21: REQ-STB-024 plan-authored animation shots (→ IN_REVIEW)
**Done:** shot-plan schema now lets the model flag pure-graphic shots with animation props (template/text/subtext); normalize validates (junk dropped, red-first); apply persists to shot.animation (migration 0020); "Apply + first frames" renders animation shots as FREE animation takes instead of buying frames; storyboard badge + prefilled ✦ Animate. Real E2E on Replan Test: the model authored a "YOUR NEXT ADVENTURE AWAITS / Ready to replan your mornings?" end-card entirely from the brief, applied, rendered $0, frame-verified; badge/prefill/recent-gens ($0.0000 remotion-local) confirmed in browser. Scratch re-archived.
**Decisions:** animation validation is strict (known template + non-empty text) — anything else drops to a normal filmed shot.
**Deferred:** subtext into the rendered take; multi-template plan schema.
**Discovered:** the model uses the animation slot correctly without few-shot examples — the schema line + "ONLY for pure graphic shots" guidance sufficed.
**Follow-ups:** —
**Gate:** full suite green (122 passed).

## 2026-07-23 — slices 19–20: reorder + Lyria epic capture + lyrics rule
**Done:** REQ-STB-022 reorder (atomic swap, ↑↓ UI, browser-verified + restored). USER Lyria requirement captured: docs/85 §Music (Lyria 3 models/prompt facts from official docs), REQ-GEN-019 (Lyria generation, pricing → OQ-114) + REQ-GEN-020 (MM:SS transcription for lyric-synced cuts) PROPOSED, BACKLOG epic line. REQ-STB-023 shipped red-first: music brief now demands full timed lyrics with [Verse]/[Chorus] tags unless instrumental — verified with real model both ways (vocal scratch brief → LYRICS section with timed tags; Aurora → explicit "Instrumental only, no vocals").
**Decisions:** one brief drives Suno AND Lyria (same lyric tag format both accept).
**Deferred:** Lyria generation + transcription are next epic slices (REQ-GEN-019/020).
**Discovered:** Lyria 3 is request/response via Interactions API — same SDK surface family as the Omni video path (OQ-112) — one Interactions integration will serve both.
**Follow-ups:** OQ-114 Lyria pricing before enabling billsCost.
**Gate:** full suite green (112 passed).

## 2026-07-23 — slice 18: REQ-STB-021 A/B take comparison (→ IN_REVIEW)
**Done:** ABCompare client overlay (shot-editor spec's last unbuilt outcome): ⇆ button appears at ≥2 takes; two videos side by side, per-side take selectors (retakes labeled), synchronized "play both", Escape/close. Browser-verified via temporary scratch shot with 2 takes (removed after).
**Decisions:** UI-only feature — no service/schema surface, so evidence is browser E2E.
**Deferred:** frame-accurate sync scrubbing (unneeded at 4–8s).
**Discovered:** —
**Follow-ups:** shot-editor feature doc now fully implemented.
**Gate:** full suite green (110 passed).

## 2026-07-23 — slice 17: REQ-STB-020 retake with instruction (→ IN_REVIEW)
**Done:** QA found SCN-STB-021 unbuilt (schema/routing existed, no service/UI). Red-first requestRetake: conditions on the SOURCE take's frame via takeProvenance (iterating on what you saw, not current selection), instruction appended with "Keep everything else the same" (prompt-guidelines v3 idiom), retake_of lineage set in materialize, style + per-shot refs respected. Per-take UI: instruction input + ↻ (take price, lane lockout). Suite stability: thumbs disabled via env in tests (docker-per-asset contention caused cross-suite flakes) — derivatives spec re-enables locally.
**Decisions:** retake conditions on source take's frame, not current selection; blank instruction rejected.
**Deferred:** real-video retake E2E behind RUN_REAL_VIDEO (§9.8 spike budget, user go-ahead pending).
**Discovered:** dockerized thumb generation was the root of the intermittent full-suite flakes (frame-reselect, ASM) — resolved by the test-env gate.
**Follow-ups:** —
**Gate:** full suite green (110 passed), stable.

## 2026-07-23 — slice 16: QA sweep — music brief was a video script, now a Suno prompt
**Done:** proactive browser QA found kind `music_brief` falling through to assembleScriptPrompt — briefs came out as video treatments (VISUAL/AUDIO timecodes). Red-first assembleMusicBriefPrompt (docs/17): MUSIC only — genre, mood, BPM, instrumentation, energy arc, vocals/instrumental, paste-ready for Suno; script passed as mood reference only; CAST blocks deliberately excluded from song prompts (video-prompt test updated to assert the exclusion). Regenerated Aurora's brief with the real model: proper instrumental chillhop prompt @110 BPM. Negative paths checked: invalid asset 404, missing project 404, invalid share token renders friendly page (reviewed OK).
**Decisions:** cast belongs in visual prompts, not song briefs — mood flows via brief + script reference.
**Deferred:** —
**Discovered:** —
**Follow-ups:** —
**Gate:** full suite green (109 passed); real-model regeneration verified in product DB.

## 2026-07-23 — slice 15: real-ring pass post-v3 + REQ-STB-005 (→ IN_REVIEW)
**Done:** DoD §9.8 real-API ring green after prompt v3 + fence-strip changes (real text, draft image, image edit — ≈$0.04); REQ-STB-005 enforcement test (cross-shot take addressing rejected, no move API on the surface) + INV-STB-005 annotation on selectTake.
**Decisions:** —
**Deferred:** —
**Discovered:** ASM ffmpeg int tests flake under full-suite contention (docker), pass in isolation — acceptable for now, note if it recurs.
**Follow-ups:** —
**Gate:** full suite green (106 passed); real ring 3/3.

## 2026-07-23 — slice 14: REQ-STB-007 re-plan replaces unpaid shots (→ IN_REVIEW)
**Done:** red-first (plans provably stacked): applyShotPlan now soft-removes take-less shots before appending the plan; shots with takes preserved (INV-STB-007). Apply buttons carry the behavior hint. Browser E2E on scratch project "Replan Test": brief → real script → real 5-shot plan → apply → re-plan (4 shots) → apply → old 5 soft-deleted, 4 live, zero stacking. Scratch project archived after.
**Decisions:** replace-unpaid MVP instead of full diff UI; frames on replaced shots are accepted losses (cheap), takes are the protected asset.
**Deferred:** selective per-shot diff apply → stays in REQ detail as deferred note.
**Discovered:** coordinate clicks on freshly scrolled pages still flaky (submits dropped) — read_page ref clicks worked this time; E2E rule of thumb: verify server-side after every click.
**Follow-ups:** —
**Gate:** full suite green (101 passed).

## 2026-07-23 — slice 13: REQ-STB-006 provenance + prompt guidelines v3
**Done:** REQ-STB-006 red-first: takeProvenance(db, takeId) reads the conditioning start-frame asset from the take's generation snapshot; frame re-selection verified non-destructive; "from older frame" dashed badge on takes whose conditioning frame ≠ current selection. USER directive: model prompt guidelines applied as PROMPT_TEMPLATE_VERSION=3 (single-continuous-shot pin, explicit audio intent with No-dialogue default, reference-preservation phrasing when refs attached, inpainting formula for edits; custom user text stays verbatim). Canonical doc: docs/85-prompt-guidelines.md (incl. reserved Omni tag scheme for OQ-112).
**Decisions:** guidelines shape AUTO prompts only — user-authored scripts sacred; Veo route never emits Omni role tags (API params carry roles).
**Deferred:** —
**Discovered:** —
**Follow-ups:** —
**Gate:** full suite green (100 passed); v3 tail visible in UI auto scripts.

## 2026-07-23 — slice 11: per-shot ref picker UI (REQ-STB-016 complete incl. web)
**Done:** ref editor on every shot card ("refs for this shot: whole cast (default) / N selected · edit"): checkbox per cast reference image with thumbnail + entity name, Save refs (subset or empty set) and "use whole cast" (reset to NULL). Script-header chips now show the shot's EFFECTIVE refs (override ?? cast). Browser-verified full cycle: default → 0 selected (ref chip disappears) → reset to cast default (DB NULL confirmed).
**Decisions:** SubmitButton now forwards name/value/title/style/className (needed for multi-button forms; earlier remove-cut styling props were silently dropped).
**Deferred:** —
**Discovered:** —
**Follow-ups:** ASM export archive guard (last integrator item).
**Gate:** full suite green (89 passed); web tsc clean.

## 2026-07-23 — slice 10: integrator wiring + generation indicators (browser-verified)
**Done:** page.tsx cost header → costMeterUsd (INV-PRJ-004; was summing failed/canceled too); share-link button on exports list (createShareLinkAction) + public /s/[token] page verified end-to-end in browser (export → share → public playback); USER request: pulsing "● generating image…/video…" badges per shot lane driven by queued/running generations (SSE clears them on completion) — verified live with a real Nano Banana frame ($0.067) that also proved the frame lands and spend meter updates.
**Decisions:** active-generation badge maps image_edit→frame lane, retake→take lane.
**Deferred:** disabling generate buttons while a lane is active → BACKLOG.
**Discovered:** worker pg-boss int test races the live queue worker (steals test jobs) — passes in isolation; another argument for the dedicated test DB (BACKLOG).
**Follow-ups:** per-shot ref picker UI; ASM export archive guard.
**Gate:** full suite green (89 passed).

## 2026-07-23 — slice 9: REQ-STB-018 plan normalization + REQ-STB-019 remove shot (→ IN_REVIEW)
**Done:** USER BUG fixed — real-model shot plans normalized (plan-normalize.ts; key variants, duration snap/clamp, junk dropped) and wired into materialize/apply/render; gen provider strips markdown fences before JSON.parse; shot-plan prompt states exact JSON shape; script + music brief render as markdown (react-markdown+gfm); failed text generations surface on script page. removeShot with INV-STB-007 confirm gate + ✕ Remove cut button. ZoomImage lightbox (USER: click small image to enlarge). Merged all 4 workflow branches (stb-016-017, prj-backfill, asm-share, gen-concurrency); migration 0014 applied; full suite 89 passed.
**Decisions:** normalize at every read of stored proposals (old rows hold raw shapes); createShot position now spans soft-deleted rows (unique-constraint bug found by red test); remove button carries confirmPaid=1 only when a take is selected, label warns.
**Deferred:** two-step confirm dialog for paid removals (label-only warning for now).
**Discovered:** Omni Interactions API supports image_to_video / reference_to_video / edit tasks (user-shared docs) → BACKLOG (evaluate vs veo-3.1-fast, OQ-112 update). Frame-candidate UX confusion → label now states "pick 1 — only the selected frame is sent to the video model".
**Follow-ups:** integrator wiring from agent notes: page.tsx cost header → costMeterUsd; share-link button on exports list; per-shot ref checkbox UI.
**Gate:** full suite green (89 passed, 4 real-ring skipped).

## 2026-07-23 — Context scaffolded (Prompt 0B)
**Done:** lib skeleton, empty ledger, build guide.
**Decisions:** contracts in `./contracts` (Zod canonical).
**Deferred:** ledger seeding → Prompt 1.
**Discovered:** —
**Follow-ups:** seed requirements from docs/13-storyboard.md.
**Gate:** n/a (no tests yet).

## 2026-07-23 — Ledger seeded (Prompt 1, compact)
**Done:** 10 REQs from docs/13; 4 READY (golden-thread shot mechanics), 6 PROPOSED compact.
**Decisions:** learning from GEN seed — PROPOSED rows stay one-liners until promoted (less ledger churn).
**Follow-ups:** Prompt 2 slice on 001–004 now.
**Gate:** n/a.

## 2026-07-23 — STB slice 1: shot mechanics + golden thread (4 × READY → IN_REVIEW)
**Done:** REQ-STB-001..004 — duration bounds from config, strict ordering, single selection, ready-only take selection; requestFrame/requestTake enqueue via GEN; materializeGenerationOutput consumes completions into frame_candidate/take rows (docs/41 choreography, synchronous for now). Migration 0003. Web UI: projects + storyboard pages with server actions; dev-inline queue drain. Browser-verified: planned → framed → generated with selections.
**Decisions:** dev tenancy = auto "Local Studio" org until PLT auth (Phase 5). Dev-inline worker drain in server actions — replace with apps/worker + pg-boss (BACKLOG).
**Deviation (learning):** red-first was not strictly observed — tests and implementation were authored in one pass (GEN slice did observe it). Next slices: write + run failing tests before implementing.
**Deferred:** reorder command (part of REQ-STB-002 full scope) → next slice; fixture tiles are CSS gradients until AST storage serves real bytes.
**Discovered:** header "0/1 generated" briefly shown pre-refresh — revalidation is fine, no action.
**Follow-ups:** human review for 001–004; worker extraction; AST ledger seed.
**Gate:** full suite green (20 tests).

## 2026-07-23 — STB slice 2: script studio (REQ-STB-008/011 → IN_REVIEW)
**Done:** red-first — draftScript → GEN kind `script` → script_version v1/v2 immutable with provenance; proposeShotPlan → kind `shot_plan` → stored proposal (mock plan: 3–7 in-bounds shots ≈ target length); applyShotPlan appends shots in order (additive MVP). GEN: text kinds land on generation.output (migration 0005), TextPromptInput + script/shot-plan assemblers. Web: /p/[id]/script page (draft, redraft, break-into-shots, apply) — browser-verified: brief → script v1 → 5-shot plan (28s/30s) → applied storyboard.
**Fixed:** migration race under parallel suites — pg_advisory_lock in migrator.
**Deferred:** revise-with-instruction chat UX; diff apply with paid-work protection (REQ-STB-007).
**Discovered:** server-action forms ignore clicks pre-hydration (bit us twice in browser tests) → BACKLOG (pending-state/disable until hydrated). Duplicate "Wake the City" project from an earlier double-submit → BACKLOG cleanup + idempotent create.
**Gate:** full suite 28/28 green.

## 2026-07-23 — STB slice 3: music brief (REQ-STB-010 → IN_REVIEW)
**Done:** red-first — requestMusicBrief (GEN kind music_brief with script context), single-row-per-project upsert on materialize (regenerate replaces, provenance via generation_id), migration 0006; mock provider routes music_brief kind to a Suno-style fixture (style/mood/structure/length/context). Script page: MUSIC BRIEF card with generate/regenerate + handoff note. Browser-verified.
**Deferred (explicit):** track attach + mix modes → needs REQ-AST-004 presigned uploads; editable brief text (BR-STB-007 edit arm) with it.
**Gate:** 38/38 green.

## 2026-07-23 — STB slice 3b: music track attach (REQ-STB-010 attach arm)
**Done:** attachMusicTrack (ready-audio-only guard, brief required) + test; script page upload/attach/replace UI with audio player; AnimaticPlayer plays the attached track under frames (BR-ASM-005 music arm). Browser-verified: track attached ✓, 0:30 player. Mix modes at export remain with REQ-ASM-004.
**Gate:** suite green.

## 2026-07-23 — STB slice 4: candidate removal (REQ-STB-009 → IN_REVIEW)
**Done:** red-first — removeFrameCandidate/removeTake: soft-delete (deletedAt), selected-candidate removal rejected `conflict`, strips/animatic exclude removed, assets stay ready (INV-AST-003 provenance). ✕ remove chips on unselected candidates only. Browser+DB verified (frame 4d69: soft_deleted=t, asset ready).
**Completes:** user requirement #4's removal arm — every image/clip/script is now editable, regenerable, AND removable, with nothing selected/exported ever destroyed.
**Gate:** suite green.

## 2026-07-23 — STB slice 5: video prompt + cast-aware script prompts (REQ-STB-012 → IN_REVIEW; USER directive)
**Done:** red-first — TextPromptInput.entities → CAST blocks in script/shot-plan/music assembly ("each shot's direction is a ready image prompt"; "reference cast members by name"); draftScript/proposeShotPlan/requestMusicBrief resolve the project cast. UI: video prompt on the create form + editable VIDEO PROMPT card on the script page (updateBriefAction). Browser: saved prompt → Redraft → v2 visibly built from it; DB snapshot has prompt text + CAST block.
**Also this tick (USER directive): Next.js 15.5 → 16.2.11** — build was type-checking workspace libs for the first time; fixed exactOptionalPropertyTypes/noUncheckedIndexedAccess sites in actions, page, executor, service types. Suite + build + browser green on 16.
**Gate:** 59 mock green (+4 real skipped); Next 16 production build clean.

## 2026-07-23 — STB slice 6: per-shot image & video scripts (REQ-STB-013 → IN_REVIEW; USER FEEDBACK priority)
**Done:** red-first — shot.image_prompt/video_prompt (migration 0012); customPrompt in frame/take assembly (verbatim body + FORMAT line; auto-composed when empty); updateShotScripts (empty → back to auto); refs unaffected (entity images + start frame still attach). UI: SCRIPTS section on every shot card — both prompts fully visible (auto shown in-place), ref thumbnails beside labels, custom/auto badge, save. Browser+DB: custom image script → snapshot starts with the exact text, auto block gone, ref still attached.
**Also this tick:** REQ-GEN-005 + REQ-ASM-006 retries (int-tested, UI wired; GEN retry browser click-through pending — flaky click, mechanism verified by tests).
**Learning:** the invisible direction→prompt assembly was a real control failure (USER: "how can you otherwise try to get them right?") — 'what the model saw' is now 'what the model WILL see', editable. docs/features/shot-editor.md should absorb this pattern (BACKLOG).
**Gate:** 67 mock green (+4 real skipped).

## 2026-07-23 — STB slice 7: prose prompts + save&generate (REQ-STB-015 → IN_REVIEW) + spec revisit
**Done:** prompt template v2 — frame/take auto-prompts are natural cinematic prose (no ENTITY:/SHOT:/FORMAT: labels; USER: "horrible slop"); custom text verbatim + minimal format tail; tests updated red/green (68 mock). Save/Save&generate frame/Save&generate take on every scripts form — editing and firing generation is one gesture (USER: "how can I call image generation with the image prompt?"). Browser: prose autos verified; button click-through yielded to the user mid-session (they took the tab — actively testing).
**Spec revisit (USER):** canonical 3-step flow written into docs/00/06/13 + feature specs; REQ-STB-016 (per-shot refs) and REQ-STB-017 (first frames on apply) promoted READY as the identified gaps. REQ-STB-014 (plan-authored scripts) traced IN_REVIEW with int evidence.
**Gate:** 68 mock green (+4 real skipped).

## 2026-07-23 — STB slice 8: per-shot refs + first frames on apply (REQ-STB-016/017 → IN_REVIEW)
**Done:** red-first (committed failing int spec ran red, then green) — migration 0013 `stb.shot.ref_asset_ids uuid[]` (NULL = whole-cast default); `updateShotRefs` (validates ready image assets; null clears to cast default); requestFrame/requestTake resolve refs as `shot.refAssetIds ?? whole-cast` (start-frame attachment on takes and prompt entity text blocks unchanged). `applyShotPlan` now returns created shot ids in proposal order; `applyPlanAction` gained a `generateFrames=1` arm that requests a start frame per created shot and dispatches via the existing drain (queue or inline); script page's apply form now has two submits: "Apply N shots" and "Apply + first frames".
**Decisions:** empty array is a valid selection ("no refs"), distinct from NULL (cast default); ref subset applies to BOTH frame and take generation (same entity-ref channel); validation error code reuses `asset_not_ready`.
**Deferred:** per-shot ref checkbox UI on the storyboard page — another agent integrates `apps/web/app/p/[id]/page.tsx` (noted in REQ-STB-016 detail block).
**Discovered:** — 
**Follow-ups:** human review for 016/017; storyboard-page ref toggles (see Deferred).
**Gate:** target spec 2/2 green; full suite 70 passed + 4 skipped.
