# Build Log — STB

## 2026-07-25 — REQ-STB-037 one workspace (→ IN_REVIEW) · REQ-STB-038 (PROPOSED)
**Done:** Replaced the two-page storyboard + script studio with a single workspace: sticky command bar (title · progress · spend · live pulse · animatic · export), left shot rail (status dot, thumbnail, duration, working pulse, film + add-shot entries), a stage that focuses ONE shot (selected take playing large, takes side by side with select/retake/overlay, frames, prompts, per-shot refs), and a right drawer with Script · Music · Cast · Output. `/p/:id/script` now redirects into the workspace. Status/progress rules extracted to `libs/stb/src/board.ts` (red-first tests). Animatic moved next to the finished cut in the film panel.
**Decisions:** Layout state (focus, open panel, panel width) lives in a client shell + sessionStorage so server-action re-renders never lose your place; every mutation stays a server action. Drawer width toggles narrow/wide for long scripts. Focus falls back to the first shot when a shot is removed.
**Deferred:** drag-to-reorder + insert-at-position → REQ-STB-038 (PROPOSED; needs a positional move service call, today's reorder is a neighbour swap). Floating/detachable panels; multi-take grid compare beyond the existing A/B overlay.
**Discovered:** the browser extension's screenshot is downscaled from a 2592px viewport — coordinate clicks miss; click by `ref` from read_page instead (memory updated).
**Follow-ups:** none.
**Gate:** RED→GREEN (board.spec 6 tests); full suite 184 passed | 14 skipped, 0 failures; tsc clean; browser walkthrough (rail focus, Script panel, Music panel with track controls beside a shot, film panel, shot 13 two-take compare); `/script` → 307.

## 2026-07-24 — REQ-STB-036 animation template variety: plan varies, user chooses (→ IN_REVIEW)
**Done:** Plan prompt schema now lists all five full-frame templates with per-template usage guidance and an explicit VARY instruction (never repeat back-to-back unless the format demands it); plan-normalize accepts the full set via shared `fullFrameAnimationTemplates` (unknown → animation dropped, shot stays filmed); executor dispatch fixed (was collapsing everything but "kinetic" to "title"); requestAnimationTake forwards subtext (input or plan); storyboard picker offers all five templates + a subtext field.
**Decisions:** Config-not-code — the template list is shared config so adding a composition makes it choosable everywhere.
**Deferred:** Per-template prop editors (structured checklist rows etc.).
**Discovered:** take-binding.int.spec cleanup deleted shots before takes (FK violation, file-level flake) — fixed to clear all project takes first.
**Follow-ups:** none.
**Gate:** RED→GREEN (4 new tests); full suite 178 passed | 14 skipped, 0 failures; tsc clean; served HTML shows all 5 options; 3 real renders + frame proofs.

## 2026-07-24 — BATCH SIGN-OFF: all IN_REVIEW → DONE (human-approved)
**Done:** USER approved the review queue verbatim: "approve all for now" (evidence: sign-off artifact + per-REQ tests/browser/real-API links in the ledger). All IN_REVIEW rows in this ledger moved to DONE atomically (dashboard row + detail block + Totals).
**Decisions:** approval is provisional ("for now") — regressions reopen the specific REQ, not the batch.
**Deferred / Discovered / Follow-ups:** none. **Gate:** ledger parse verified via scripts/progress.ts.

## 2026-07-24 — REQ-STB-029 route-aware shot durations (→ IN_REVIEW)
**Done:** `shotDurationPolicy()` in shared config resolves the duration palette from `config.gen.videoRoute` at call time: Veo {4,6,8} cap 8 (unchanged), omni integers 4–10 cap 10. Wired into plan normalization (5s/10s survive, 12→10), `assertDuration` (INV-STB-001 cap follows the route), music-sync suggestions (a 7s boundary hit is now suggestible), and the shot-plan prompt schema (`durationS:4|5|…|10` on omni). Red-first 7 tests; veo-route regression pinned by tests + browser check (sync panel still suggests 6→8 on the production project).
**Decisions:** palette floor stays `shot.minSeconds` (4s) — sub-4s omni clips unverified; revisit for hype-countdown rapid cuts.
**Deferred:** UI duration picker unaware of the palette (server-side validation covers it).
**Discovered:** none. **Follow-ups:** none. **Gate:** 154 passed, tsc clean. (Story & Storyboard)

## 2026-07-23 — slice 39: plan-authored template choice + ring re-run
**Done:** eval-#2 finding closed — the shot-plan model now chooses the animation TEMPLATE per shot ("title" for held cards, "kinetic" for punchy word-by-word type: countdown digits, lyric lines, interstitials); normalize validates both (red-first), apply+first-frames renders with the plan's choice, and the per-shot template select prefills from it. DoD §9.8: real ring re-run green (3/3) covering yesterday's entity-prose dedup.
**Decisions:** — **Deferred:** — **Discovered:** — **Follow-ups:** —
**Gate:** full suite 136; real ring 3/3; tsc clean.

## 2026-07-23 — slice 38: user's orphaned take completed + prose dedup
**Done:** the reaped orphan (user's own $-take click on "Momentum", Pasi testaa) completed via the REQ-GEN-014 retry path — real Veo take generated, materialized, left UNSELECTED for the user's judgment; the failed row shows `orphaned` + retry in RECENT GENERATIONS exactly as designed. Micro-fix from reviewing their board: "Featuring Pasi, Pasi" prose echo when an entity's description repeats its name — dedup'd in both take and frame assembly (red-first).
**Decisions:** never auto-select a take generated on the user's behalf — their creative call.
**Deferred:** — **Discovered:** — **Follow-ups:** —
**Gate:** full suite green (135); take verified in UI.

## 2026-07-23 — slice 37: projects home is a gallery
**Done:** project cards now lead with a 16:9 poster — each project's newest ready image served as a ~20KB thumbnail (?thumb=1, REQ-AST-005 derivatives paying off), honest "no frames yet" placeholder otherwise. Browser-verified: Pasi testaa and Aurora show real posters; layout holds.
**Decisions:** poster = newest ready image (simple, self-updating as work progresses).
**Deferred:** — **Discovered:** — **Follow-ups:** —
**Gate:** suite green (133); home 200.

## 2026-07-23 — slice 36: browser QA sweep of all post-flake controls
**Done:** systematic storyboard sweep — inventory confirmed present and correctly priced: captions select (off/lyrics/dialogue), style select (Golden Hour selected), audio select, directing-era budget meter (today $10.95/$20.00 with raised cap), reorder ↑↓, remove cut, 2-frames $0.13, per-duration take prices ($0.60/6s, $0.80/8s), template select (title/kinetic) + animate + retake/overlay inputs on every card, style-infused auto-script placeholders. ANIMATIC exercised for the first time in-browser: full-screen playback with cue progress (5.7s/17s), per-shot titles, honest "skipped (no frame)" listing, music playing; opened via the documented space shortcut (pointer clicks flaked extension-side — component verified correct).
**Decisions:** no app defects found — sweep closes the verification debt from the click-flake sessions.
**Deferred:** —
**Discovered:** the space-key shortcut is the most reliable E2E path for the animatic — noted for future sweeps.
**Follow-ups:** —
**Gate:** no code changes; suite green at last run (133).

## 2026-07-23 — slice 34: label mitigation shipped + dossier on the review page
**Done:** twice-observed label garbling mitigated: frame prompts with product/company entities now instruct legible-exactly-as-named OR naturally de-emphasized label text, never extreme close-ups of printed text (red-first, docs/85 §9); sign-off page refreshed with the 6-archetype TASTE dossier section (per-archetype result + highlight) and updated stats (132 tests, $12.6 total spend).
**Decisions:** —
**Deferred:** REQ-GEN-021 dialogue transcription (next build item when prioritized).
**Discovered:** —
**Follow-ups:** await user batch approval / new direction.
**Gate:** full suite green (132 passed).

## 2026-07-23 — slice 33: ARCHETYPE EVAL #6 — Character story ($2.28) — EVAL PROGRAM COMPLETE
**Done:** "The First Customer" — 6-shot story with concrete beats (setup → notification → disbelief → victory → spoken line → toast); dialogue authored into the video script per recipe (he "whispers softly 'We're really doing this'"); Pasi entity refs attached to every generation; two takes incl. the dialogue shot; FIRST REAL PERFORMANCE RETAKE ("hold the smile a beat longer, warmer eyes, softer whisper") — lineage-linked, conditioned on the source frame, selected over the original; understated Lyria score (recipe musicBias); MIX export preserving the whisper under the bed. Shared. $2.28; today ≈ $11.8/$20.
**Taste review:** structure ✓ (real beats) · one-idea ✓ · continuity ◐ (refs attached everywhere — the mechanism; frame-level identity match across all shots not deeply audited, single-frame check plausible) · contrast ✓ (close notification vs wide kitchen) · cuts-on-music ◐ (understated score, sync minor) · end-held ✓ (Solo Toast planned as closer). FINDINGS: (1) dialogue lands in video scripts but direction.dialogue stayed empty — cosmetic split, prompts unaffected; (2) REAL GAP: "captions for dialogue" (recipe line) is unimplementable — captions burn the MUSIC transcript; dialogue captioning needs transcribing the EXPORT/take audio → filed REQ-GEN-021 PROPOSED.
**EVAL PROGRAM SUMMARY (6/6):** every archetype produced its recipe structure unaided. Defects found across the program: 8; fixed in-program: 6 (timecode overlay, kinetic scaling, template param, Lyria vocabulary, lyric-verbatim recipe, eval-title leak); promoted: 2 (label micro-text, dialogue captions). The taste loop demonstrably compounds — later evals inherited earlier fixes cleanly. Total program cost ≈ $8.2.
**Decisions:** archived; REQ-STB-027's eval clause satisfied — evidence across all six forms.
**Deferred:** REQ-GEN-021 (dialogue transcription); label mitigation (next).
**Follow-ups:** refresh sign-off page with the taste dossier.
**Gate:** export succeeded.

## 2026-07-23 — slice 32: ARCHETYPE EVAL #5 — Product launch ($1.55)
**Done:** "The Can, Considered" — recipe delivered: 5 shots (4 macro/context product beats + Brand Resolve end card), match-cut-flavored titles ("Texture & Form", "The Mark", "The Break & Pour"); archetype default flipped audio to MIX; two real macro takes (can texture, tab crack) with native Veo SFX preserved under the ducked Lyria bed (aac amix confirmed by probe); highlightWord passthrough shipped this slice and used in-recipe — end card renders "KAIJU" with the completed golden highlight sweep. Export 3-ready, shared. $1.55; today ≈ $9.5/$20.
**Taste review:** structure ✓ · one-idea ✓ (each macro one texture/action) · continuity ✓ (product in every filmed shot) · contrast ✓ (macro/context alternation planned) · cuts-on-music ◐ (precise/percussive brief; sync not applied — minimal sections) · end-held-frame ✓ (highlighted brand card). FINDING: label micro-text garbling recurred on the tightest macro (known from eval #2, mitigation still queued) — no NEW defects.
**Decisions:** archived after review.
**Deferred:** eval #6 (character-story — the last); label-fidelity mitigation now twice-observed, promote next.
**Discovered:** mix mode + Veo native SFX is convincing — the tab-crack survives under the bed exactly as the recipe intended.
**Follow-ups:** eval #6, then close the eval clause on the directing epic.
**Gate:** export succeeded; suite green at last run.

## 2026-07-23 — slice 31: ARCHETYPE EVAL #4 — Cinematic mood film ($1.95)
**Done:** "First Light at the Harbor" — recipe followed unaided: 4×8s filmed shots, zero graphic shots, patient single-idea compositions (mist, rope dew, departure, horizon hold). Two real 8s Veo takes (first 8s takes ever — old cap couldn't afford them): the departure and the closer; ANM-002 lower-third overlay applied to the closer IN-RECIPE ("lower-third only in the final shot") — first eval exercising overlays. Sparse ambient Lyria first-try. Export (2-shot 16s mood cut), shared. Frame proof: the closer — lone boat silhouetted on golden misty water, sun rays, title lower-third bottom-left — the strongest single image the system has produced.
**Taste review:** structure ✓ (calm build to departure) · one-idea ✓ (textbook: each shot one texture) · continuity ✓ (harbor world) · contrast ✓ (macro rope vs wide water) · cuts-on-music ◐ (ambient brief has no hard sections; sync not meaningful here — archetype-appropriate) · end-held-frame ✓✓ (8s golden hold + quiet lower-third; the principle at its best). NO new defects — first clean eval.
**Decisions:** archived after review.
**Deferred:** evals #5–6.
**Discovered:** 8s takes are where Veo shines for mood work; the style kit + archetype pairing carries composition quality more than shot-count.
**Follow-ups:** eval #5 product-launch (mix audio, macro match-cuts).
**Gate:** export succeeded; today ≈ $7.9/$20.

## 2026-07-23 — slice 30: ARCHETYPE EVAL #3 — Lyric video ($0.75) + budget raise
**Done:** USER raised testing budget to $20 (config cap 5→20, documented). Music-FIRST eval per docs/87: brief→Lyria vocal song→transcript, THEN plan. First plan FAILED the recipe (2/5 animation shots, invented text incl. "EVAL_INIT()" riffed off my project title) → TWO fixes: (1) lyric-video planBias hardened to STRICT verbatim-lyrics-from-transcript, ≥2/3 animation shots (config-only change); (2) Prompt 5 now mandates real-sounding eval titles (titles leak into prompts). Re-plan: 4/5 animation shots each carrying the EXACT sung line. Kinetic renders, one filmed atmosphere take, MUSIC-SYNC APPLIED for the first time in an eval (3 suggestions → cuts at 16/24/32s section boundaries; changed animations re-rendered at new lengths), export, share. FRAME PROOF of the whole thesis: 14s shows "LATE NIGHTS TURN TO MORNING LIGHT", 18s (past the 16s boundary) shows the next line "EVERY LINE IS…" mid-pop — the sung words on screen, switching exactly on the song's structure. $0.75.
**Taste review:** structure ✓ (follows the song by construction) · one-idea ✓ (one line per shot; Hold shots = same line sustained) · continuity n/a (typography piece) · contrast ◐ (filmed atmosphere only in the intro — acceptable for the form) · cuts-on-music ✓✓ (FINALLY exercised; the whole point of the archetype, and it works) · end-held-frame ◐ (last shot is a lyric hold; a dedicated outro card would be stronger — minor).
**Decisions:** archived after review.
**Deferred:** evals #4–6; outro-card nuance for lyric recipes.
**Discovered:** the taste loop's strongest pattern yet — recipe failure → config-only fix → immediate re-plan success, all inside one tick.
**Follow-ups:** evals #4–6 with the raised budget.
**Gate:** suite green (130); export succeeded.

## 2026-07-23 — slice 29: ARCHETYPE EVAL #2 — Brand pulse ($0.82)
**Done:** Prompt 5 run on "EVAL Brand Pulse": recipe followed unaided (7 shots: product-forward beats, mid-video kinetic-slot interstitial "ONE CITY. ONE PULSE.", 6s end-card "UNLEASH THE PULSE" — note the recipe's longer-final-shot principle emerged as 6s vs 4s beats without being asked); Lyria passed FIRST TRY (vocabulary guideline from eval #1 held); real hero take "Concrete Slam" — hand slamming the can into a wet neon street, splash frozen mid-burst, NO timecode artifact (eval-#1 fix confirmed working on a new take). Export 3-ready cut (hero → interstitial → end card), shared. Total $0.82; today ≈ $4.43/$5.
**Taste review:** structure ✓ · one-idea-per-shot ✓ · continuity ✓ (can in every filmed beat) · contrast ✓ (filmed/graphic alternation; splash vs static type) · cuts-on-music untested again (transcript generated but sync not applied — NOTE: apply sync in eval #3) · end-held-frame ✓ (6s card). FINDINGS: (1) generated micro-text on the can label garbles ("JU CM") — mitigation candidates: entity description states label text explicitly, or image scripts avoid tight label close-ups; BACKLOG. (2) interstitial template choice is my script's heuristic — the PLAN should author template (extend plan animation schema with template: title|kinetic); BACKLOG.
**Decisions:** eval projects archived after review (list hygiene).
**Deferred:** evals #3–6 (fresh cap); label-fidelity mitigation; plan-authored template.
**Discovered:** both eval-#1 fixes (no-on-screen-text, Lyria vocabulary) held on fresh runs — the taste loop is compounding.
**Follow-ups:** eval #3 = lyric-video (music FIRST, sync applied).
**Gate:** export succeeded; suite untouched since last green.

## 2026-07-23 — slice 28: process refresh — prompts.md learns from the day
**Done:** prompts.md updated with practiced-and-proven additions: Prompt 2 GATE gains the tsc rule (vitest doesn't typecheck), browser-verify-fresh + server-side-fallback rule, and the real-cost verification tiers; Prompt 4 gains the "epic directive → canonical doc first" pattern; NEW Prompt 5 — the archetype eval taste loop (exact recipe practiced in eval #1, incl. Lyria retry protocol and frame-extraction review); Tips gain config-not-code, prompt-guideline-over-retry-loop, and evidence-beats-assertion. Health pass green (suite 130, all pages 200).
**Decisions:** process docs record PRACTICED behavior only — nothing speculative added.
**Deferred:** —
**Discovered:** —
**Follow-ups:** evals #2–6 via Prompt 5 on fresh cap.
**Gate:** suite green; pages healthy.

## 2026-07-23 — slice 27: music-failure visibility + typecheck catch + review refresh
**Done:** script-page failure banner now covers `music` and `transcript` kinds with a specific hint for policy blocks ("Regenerate the brief, then Generate track again — failed generations are never charged") — verified rendering live on the eval project's real failed row. Typecheck caught that TextPromptInput.transcript never landed (vitest doesn't typecheck; slice-25 edit had silently missed) — fixed properly. Sign-off review page refreshed: 73 IN_REVIEW, $3.61 total spend, eval evidence noted; same URL.
**Decisions:** —
**Deferred:** —
**Discovered:** two silent-replace misses in one day (template param, transcript field) — process note: after python str.replace edits, ALWAYS run tsc, not just vitest.
**Follow-ups:** evals #2–6 on tomorrow's cap.
**Gate:** full suite green (130 passed); web tsc clean.

## 2026-07-23 — slice 26: ARCHETYPE EVAL #1 — Hype countdown ($0.83) + three taste fixes
**Done:** first docs/87 eval render, full path on "EVAL Hype Countdown": archetype plan came out EXACTLY per recipe (filmed beats alternating kinetic 3-2-1 interstitials, all 4s, reveal, end card — zero manual intervention); 4 real frames, real Veo reveal take (can slamming into rain-soaked neon street), free animations, Lyria (first brief POLICY-BLOCKED on "aggressive/industrial" vocabulary), export + share.
**Taste review vs the six principles:** structure ✓ (countdown arc is inherent); one-idea-per-shot ✓; continuity ✓ (can in every filmed shot); contrast cuts ✓ (filmed/graphic alternation is the archetype's core); land-cuts-on-music — untested (transcript exists but sync panel not applied this run); end-held-frame ✓ (end card). DEFECTS FOUND & FIXED: (1) Veo burned a timecode overlay into the reveal → auto video prompts now forbid on-screen text/timestamps/UI (v3 guideline, red-tested); (2) countdown digits rendered small/quiet → KineticText now scales font by content length (single digit = 420px, fills frame — re-rendered & re-exported, frame-verified); (3) requestAnimationTake silently dropped the template param (earlier replace never landed) → fixed, template now in snapshots.
**Decisions:** Lyria vocabulary guideline added to the music-brief prompt (describe energy positively) — second policy block avoided on regenerate.
**Deferred:** regenerating the reveal take without the timecode ($0.40) — the fix applies to all future takes; remaining 5 archetype evals (fresh daily headroom).
**Discovered:** the archetype planBias is powerful — the model followed "alternate filmed beats with kinetic-text number interstitials" literally and well.
**Follow-ups:** evals #2–6; apply music-sync during evals.
**Gate:** full suite green (130 passed); final export succeeded; today's spend ≈ $4.4/$5 cap.

## 2026-07-23 — slice 25: REQ-STB-027 + 028 (→ IN_REVIEW)
**Done:** archetype defaults (audioMixMode per recipe) applied on selection — E2E: product-launch flipped Aurora to mix, restored to brand-pulse/music. Music-led planning: plan prompt gains the TRANSCRIPT block (align boundaries to [MM:SS] sections; lyric lines into animation-shot text) whenever a transcript exists — red-first prompt tests + live snapshot E2E (transcript + DIRECTING co-present). The full docs/87 loop is now wired: archetype shapes script/plan/music; transcript shapes the plan; music-sync shapes durations; animation shots carry type.
**Decisions:** lyrics-FIRST one-click orchestration deferred until the manual sequence proves clumsy.
**Deferred:** per-archetype eval renders (the real taste test — needs fresh spend headroom, likely tomorrow's cap).
**Discovered:** —
**Follow-ups:** eval renders per archetype.
**Gate:** full suite green (130 passed).

## 2026-07-23 — slice 24: REQ-STB-026 archetype selection (→ IN_REVIEW)
**Done:** six directing recipes as config (archetypes.ts — taste is now tunable data); migration 0021 (project.archetype); recipeFor injects DIRECTING into script+plan, planBias into plan, musicBias into music brief; PRJ setProjectArchetype; script-page "directing:" select. Red-first prompt tests; E2E: Brand pulse set on Aurora → draft snapshot opens with the full DIRECTING block (verified, gen canceled — no spend).
**Decisions:** recipes are config-not-code so taste iteration never needs a code review; freeform (null) stays the default.
**Deferred:** REQ-STB-027 (archetype defaults + eval renders), REQ-STB-028 (lyrics-first).
**Discovered:** —
**Follow-ups:** archetype eval renders per docs/87 (one real golden path per archetype, taste-reviewed).
**Gate:** full suite green (128 passed).

## 2026-07-23 — slice 23: GOLDEN PATH capstone — full product journey, one project, $0.61
**Done:** end-to-end integrated test on fresh project "Kaiju Dawn — Golden Path": cast (KAIJU Can) + style (Golden Hour) attached → real script → real 4-shot plan (model authored the Brand End-Card as an animation shot unprompted) → 3 real frames ($0.20) + free end-card render → real Veo hero take ($0.40, frame-conditioned, styled, can refs) → music brief with lyrics → Lyria song (first attempt POLICY-BLOCKED — error taxonomy surfaced the provider message cleanly; regenerated brief succeeded, $0.08) → MM:SS transcript (vocals: [00:31] Pre-Chorus etc.) → captioned export (2 ready, 2 skipped explicitly) → share link → frame proofs: captioned Veo cityscape + KAIJU CAN end-card. Total $0.61.
**Decisions:** golden-path exports skip frame-only shots rather than buying takes (cost discipline).
**Deferred:** —
**Discovered:** Lyria content-policy rejections happen on innocuous-looking briefs — the retry-with-regenerated-brief pattern worked; consider surfacing a "regenerate brief & retry" hint on music failures (BACKLOG-worthy if it recurs). USER filed REQ-ANM-004 (effects library) mid-tick — captured PROPOSED.
**Follow-ups:** REQ-ANM-004 slices next.
**Gate:** export succeeded; all stages real; suite untouched (126 green at last run).

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

## 2026-07-24 — REQ-STB-030 route-aware UI (→ IN_REVIEW)
**Done:** shared `estimateTake()` (gen/cost.ts, red-first) replaces the page's inline veo snap math; storyboard header gains a route badge with switch instructions. Browser-verified on the harbor project: "route: veo" badge, 10s shot honestly reads "≈ $0.80 · 8s" with tooltip, 6s shot plain "$0.60".
**Decisions:** estimates always describe what the ACTIVE route would do — no phantom omni prices on a veo server.
**Deferred:** per-project route picker (mixed-route projects need a product decision).
**Discovered:** none. **Follow-ups:** none. **Gate:** 156 passed, tsc clean.

## 2026-07-24 — REQ-STB-031 USER BUG: "Kaiju video has no sound" (→ IN_REVIEW)
**Done:** Diagnosis proved the media was fine — the hero take has aac audio and the export's Lyria mix measures mean −15.8 dB / max −2.3 dB — but the storyboard tile `<video>` was hard-coded `muted`, so every preview started silent and the product *seemed* soundless. Attribute removed (click-to-play with controls — no autoplay-noise concern); rendered HTML verified attribute-free and the tile mute icon is gone. Share page and ABCompare were already correct.
**Decisions:** players default audible everywhere; the animatic keeps its own music-track audio path.
**Deferred:** — **Discovered:** shots 1–4 of KAIJU still carry plan-era "claw logo" wording in their scripts (only the hero was re-scripted) — harmless unless reshot; offer cleanup.
**Follow-ups:** user re-test with sound. **Gate:** tsc clean; page 200.

## 2026-07-24 — Data hygiene: last "claw logo" wording purged from KAIJU scripts
**Done:** Quiet Alley Spark's plan-era scripts still said "KAIJU Can with a black claw logo" (the phrase that summoned the Monster mark). Targeted replace → "original black kaiju-dragon emblem", matching the canonical ref/description. Zero claw references remain in live shot scripts; a future reshoot of any KAIJU shot now inherits clean wording.
**Decisions:** minimal phrase-level edit only — the rest of the machine-authored creative text untouched.
**Deferred/Discovered/Follow-ups:** none. **Gate:** health green.

## 2026-07-24 — FULL LYRIC-VIDEO production "Neon Rivers" ($0.65) — the last archetype at full length
**Done:** music-first golden path on the omni route: vocal Lyria track with real timestamped lyrics → transcript → plan FROM transcript (4 of 5 shots are FREE lyric-carrying animations — the recipe's typography-first structure emerged unaided; verbatim-lyrics rule held) → 1 filmed intro take (5s omni $0.5068) → sync landed two cuts on lyric boundaries (5s/4s odd durations — omni palette) → free re-render of the two resized animations → 27.02s aac export. Beat review: structure ✓ · one-idea ✓ · contrast ✓ (filmed/kinetic/title alternation) · end-held ✓ (underlined title card).
**Defects found → PROPOSED:** (1) REQ-ANM-005 — plan-authored palette intent (cyan/magenta synthwave) dropped; templates rendered default gold. (2) REQ-STB-032 — lyric shots placed by storyboard order, not sung-at timestamps (verse text at ~8s vs vocals at 0:23; long-intro tracks expose it).
**Decisions:** recipe-pure export (captions off — kinetic text IS the visual); animated-captions double-export skipped as redundant with the gated int test.
**Discovered:** sync-then-rerender for animation shots should be automatic (driver does apply→sync; resized animation takes need a free re-render pass) — folded into REQ-STB-032's design space.
**Follow-ups:** user look at /p/019f9324-… **Gate:** export verified; spend today ≈ $8.8/$100.

## 2026-07-24 — REQ-STB-032 → BLOCKED on OQ-115 (design call drafted)
**Done:** the lyric-alignment ambiguity is now a proper open question (docs/08 OQ-115) with three concrete strategies, trade-offs, and a recommendation ((c): archetype-chosen, track-offset first). REQ-STB-032 flipped PROPOSED → BLOCKED with the OQ id in all 3 ledger places — per §6 SPECIFY, ambiguous requirements don't get guessed at.
**Decisions:** none taken — that's the point; the call is the user's.
**Deferred/Discovered/Follow-ups:** none. **Gate:** ledger parse via progress.ts.

## 2026-07-24 — REQ-STB-033 cast visibility everywhere (→ IN_REVIEW) — USER usability pass
**Done:** shared CastBar component (checkbox chips + ref thumbnails + accent `profile` badge + Save cast + library link) now on storyboard AND script studio; the script-studio copy explains exactly what feeds script/plan/music prompts; projects home header links to the library. Browser-verified on all three views — and the script-studio bar immediately earned its keep by revealing that ModernPath launch had NO cast attached (scripts were drafted with zero entity context, invisible before).
**Decisions:** one component, view-specific note prop — no divergent cast UIs.
**Deferred:** per-shot cast override UI stays storyboard-only.
**Discovered:** user uploaded a Pasi photo — the ref-less card era is over.
**Follow-ups:** user may want to check ModernPath's cast boxes + redraft for company-aware scripts.
**Gate:** 172 passed, tsc clean, browser ×3.

## 2026-07-24 — REQ-STB-034 first take auto-selects (→ IN_REVIEW) — USER: "why can't I export?"
**Done:** Diagnosis: ModernPath launch had all 5 takes bought and finished but ZERO selected — export requires selectedTakeId, so the button honestly said "Export 0 ready · skip 5" and read as broken. Fix red-first (2 int tests): materializeGenerationOutput auto-selects a take landing on a selection-less shot; an existing selection is never overridden. Backfilled the 5 stranded ModernPath takes via the driver's takes stage; browser-verified: 5/5 generated, clean "Export cut" button.
**Decisions:** refines slice-38's no-auto-select rule — that covered agent-initiated repairs; a user's own take filling an empty slot is their action. Frames keep explicit pick (2 candidates by design).
**Deferred:** — **Discovered:** — **Follow-ups:** user hits Export cut.
**Gate:** 173 passed, tsc clean, browser verified.

## 2026-07-24 — REQ-STB-035 script-studio generation indicators (→ IN_REVIEW) — USER mid-flow report
**Done:** the script page now surfaces live activity: pulsing accent banner naming the active kind(s) (script/shot plan/music brief/music track/transcript) + all five trigger buttons lock and relabel while their lane runs. Verified via served HTML with a synthetic queued row (grep initially missed because RSC flight data splits text nodes — recorded). Cleaned the synthetic row after.
**Decisions:** DB-driven indicator (matches storyboard pattern) — SubmitButton pending alone can't cover queue-mode gaps.
**Deferred:** — **Discovered:** zsh reserves $GID (two confusing shell failures) — use $ROWID in ad-hoc SQL snippets.
**Follow-ups:** — **Gate:** 173 passed, tsc clean.
