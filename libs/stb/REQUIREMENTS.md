# Requirements Ledger — STB (Story & Storyboard)

## Dashboard — STB (Story & Storyboard)
Totals: 30 DONE · 17 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 0 PROPOSED · 0 DEFERRED · 1 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-STB-001 | Shot duration within config bounds | P1 | DONE | INV-STB-001 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-002 | Shots hold a strict total order | P1 | DONE | INV-STB-002 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-003 | Single selection per slot / take | P1 | DONE | INV-STB-003 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-004 | Take selectable only when asset ready | P1 | DONE | INV-STB-004 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-005 | Take belongs to its shot, never moved | P2 | DONE | INV-STB-005 | tests/take-binding.int.spec.ts | selectTake guard (// INV-STB-005), no move API |
| REQ-STB-006 | Frame re-selection keeps takes + provenance | P2 | DONE | INV-STB-006 | tests/frame-reselect.int.spec.ts | takeProvenance, 'from older frame' badge (page.tsx) |
| REQ-STB-007 | Shot-plan apply replaces unpaid, protects takes | P2 | DONE | INV-STB-007, BR-STB-005 | tests/replan-protect.int.spec.ts + browser E2E | applyShotPlan (replace arm), apply-button hint |
| REQ-STB-008 | Script versions via draft/revise | P2 | DONE | `docs/13` §6, BR-STB-005 | tests/script.int.spec.ts | src/service.ts |
| REQ-STB-009 | Candidate removal (soft, unselected only) | P2 | DONE | POL-STB-002/003, INV-AST-003 | tests/remove.int.spec.ts + browser | src/service.ts (removeFrameCandidate/removeTake) |
| REQ-STB-010 | Music brief: generate Suno prompt (attach/mix arms follow) | P3 | DONE | BR-STB-007, `docs/17` §1 | tests/music.int.spec.ts + browser E2E | src/service.ts, apps/web (script page) |
| REQ-STB-026 | Archetype selection injects directing recipe | P7 | DONE | docs/87 | libs/gen/tests/prompt.spec.ts (REQ-STB-026 block) + snapshot E2E | config/archetypes.ts, migration 0021, recipeFor injection ×3, script-page select |
| REQ-STB-027 | Archetype defaults (audio mode) | P7 | DONE | docs/87 | E2E (product-launch → mix) | archetypes defaults, setProjectArchetype |
| REQ-STB-028 | Music-led planning (transcript in plan prompt) | P7 | DONE | docs/87 | prompt.spec REQ-STB-028 + snapshot E2E | prompt transcript block, proposeShotPlan wiring |
| REQ-STB-029 | Route-aware shot durations (omni unlocks 4–10s) | P7 | DONE | REQ-GEN-023 follow-up | tests/duration-policy.spec.ts (7) | shared shotDurationPolicy; plan-normalize, music-sync, assertDuration, plan prompt schema |
| REQ-STB-035 | Script-studio generation indicators + lane lockouts | P8 | IN_REVIEW | USER 2026-07-24 "this view does not show any generation indicators" | rendered-HTML check (synthetic queued row → banner) | script page activeGens query, pulse banner, 5 button lockouts |
| REQ-STB-037 | One workspace: rail + focused shot + script/music/cast/output drawer | P8 | IN_REVIEW | USER 2026-07-25 UX review ("controls and flow does not seem intuitive… cant control easily the music etc on editor") | tests/board.spec.ts (6) + browser walkthrough (rail, drawer tabs, film, 2-take compare) | components/Workspace.tsx, libs/stb/src/board.ts, p/[id]/page.tsx rewrite, script route → redirect |
| REQ-STB-038 | Reorder shots by drag or ▲▼ | P9 | IN_REVIEW | USER 2026-07-25 "how can I actually change the order of the clips?" | tests/move-shot.int.spec.ts | stb/service.ts · components/Workspace.tsx · components/Timeline.tsx |
| REQ-STB-039 | Music timeline: clips on the track's time axis, drift + off-beat cuts | P8 | IN_REVIEW | USER 2026-07-25 ("see the music timing within the clips… if I add a new clip it might outsync") | tests/timeline.spec.ts (9) + browser (Neon Rivers 5 clips, boundary ticks, 3/5→5/5 off-beat after a length edit) | libs/stb/src/timeline.ts, components/Timeline.tsx, ast/src/probe.ts (ffprobe), upload+music duration recording |
| REQ-STB-040 | Edit clip length: free crop vs regenerate, stated per shot | P8 | IN_REVIEW | USER 2026-07-25 ("edit the length of clips (+regenerate or crop)") | tests/timeline.spec.ts crop/shortfall block + browser (5s→6s persisted, ⚠ 1s short, take price 0.51→0.61) | updateShotDurationAction, stage length editor, trimmedS/shortfallS in timeline.ts |
| REQ-STB-036 | Animation template variety: plan varies, user chooses | P8 | IN_REVIEW | USER 2026-07-24 "animations are really limited, always repeating one" | plan-normalize spec REQ-STB-036 + prompt.spec template-set block | plan schema/guidance, normalize via shared template list, executor dispatch fix, UI picker + subtext field |
| REQ-STB-048 | The plan casts the film; missing characters get a portrait | P9 | IN_REVIEW | USER 2026-07-27 "other characters than Pasi are not kept… director should think of cast and list them" | tests/casting.spec.ts (14) + casting-portrait.int.spec.ts (5) + prompt.spec.ts REQ-GEN-030 (5) | stb/casting.ts, requestEntityPortrait/castFromPortrait, toPortraitStyle, casting UI |
| REQ-STB-047 | Prompt drift audit + restore from plan | P9 | IN_REVIEW | USER 2026-07-27 "this does not sound like the prompt that was used for this image / video?" | manual audit + restore verified on the live project | scripts/audit-prompts.ts, pnpm audit:prompts |
| REQ-STB-046 | A shot's spoken line is editable without re-planning | P9 | IN_REVIEW | USER 2026-07-27 (dialogue missing from every shot) | tests/dialogue.int.spec.ts (5) | stb updateShotDialogue, saveScriptsAndGenerateAction, SPOKEN LINE field |
| REQ-STB-045 | Per-shot prompt identity + reference scrub at the prompt boundary | P9 | IN_REVIEW | USER 2026-07-26 "the image prompt is not retained, so I could actually generate alternative images" | apps/web/tests/stage-panel-identity.spec.tsx (3) + prompt.spec.ts (4) | page.tsx key={s.id}, prompt.ts guard(), shared/reference-scrub.ts |
| REQ-STB-044 | The film's look reaches every picture (card → frame/take/animation) | P9 | IN_REVIEW | USER 2026-07-26 "styling was not held in the images… also character clothing changes" | tests/card-prompts.int.spec.ts (5) | stb/service.ts projectCard, shared continuity axis, style-compiler |
| REQ-STB-043 | Director's pass: plans graded against the active card before anything is billed | P9 | IN_REVIEW | EPIC-STB-001 SR-DIR-006 (USER 2026-07-26 "Director's pass would be quite cool") | tests/director-pass.spec.ts (13) + live plan run | src/director-pass.ts · plan-normalize grammar fields · gen/prompt.ts plan schema |
| REQ-STB-042 | Style Card contract: archetypes become data, refusals become expressible | P9 | IN_REVIEW | EPIC-STB-001 SR-DIR-003 (USER 2026-07-26 "further styling options… a bit humoristic") | shared/tests/style-card.spec.ts (18) | shared/contracts/style-card.ts · shared/config/style-cards.ts |
| REQ-STB-041 | Shot grammar: typed craft vocabulary + plan grader | P9 | IN_REVIEW | EPIC-STB-001 SR-DIR-001/002 (USER 2026-07-26 "improve the artistic director skills… directed by Aki Kaurismäki") | tests/grammar.spec.ts (11) | shared/config/grammar.ts · libs/stb/src/grammar.ts |
| REQ-STB-034 | First take auto-selects (export never silently empty) | P8 | IN_REVIEW | USER 2026-07-24 "why can't I export" (5 takes bought, 0 selected → Export 0 ready) | tests/take-binding.int.spec.ts REQ-STB-034 + browser (5/5 generated) | materializeGenerationOutput take branch |
| REQ-STB-033 | Cast visibility everywhere (bar with refs + profile badges; library from home) | P8 | IN_REVIEW | USER 2026-07-24 usability screenshots | browser E2E ×3 views | components/CastBar.tsx, script page wiring, home library link |
| REQ-STB-032 | Lyric-shot alignment (text appears when the line is sung) | P8 | BLOCKED | Neon Rivers 2026-07-24 · blocked on OQ-115 (strategy: fill-to-timestamp vs track offset vs both) | — | — |
| REQ-STB-031 | Storyboard players audible (no forced mute) | P7 | IN_REVIEW | USER BUG 2026-07-24 "Kaiju video has no sound" | server-rendered markup + browser (mute icon gone) | page.tsx tile <video> unmuted |
| REQ-STB-030 | Route-aware UI (route badge + honest take estimates) | P7 | DONE | BACKLOG 2026-07-24 (10s omni shot showed veo-snapped $0.80) | libs/gen/tests/omni-video.spec.ts REQ-STB-030 block + browser | gen estimateTake, storyboard header badge, take-button estimate + effective-duration hint |
| REQ-STB-025 | Lyric-synced cut suggestions (♪ MUSIC SYNC) | P6 | DONE | USER Lyria epic ("time the change of scene according to song timing") | tests/music-sync.spec.ts + update-duration.int + browser E2E | src/music-sync.ts, updateShotDuration, applySyncAction, SYNC panel |
| REQ-STB-024 | Plan-authored animation shots (free, no frame spend) | P6 | DONE | USER Remotion epic ("purely remotion animations (prompt)") | plan-normalize spec + real E2E frame | migration 0020, normalize/apply, plan prompt, applyPlanAction branch, badge+prefill UI |
| REQ-STB-023 | Music brief includes timed lyrics unless instrumental | P5 | DONE | USER 2026-07-23 (Lyria epic) | libs/gen/tests/prompt.spec.ts + real-model check | assembleMusicBriefPrompt lyrics rule |
| REQ-STB-022 | Reorder shots (animatic/export follow) | P2 | DONE | SCN-STB-010, INV-STB-002 | tests/reorder.int.spec.ts + browser E2E | reorderShot (3-step swap), ↑↓ UI |
| REQ-STB-021 | A/B take comparison | P2 | DONE | docs/features/shot-editor.md | browser E2E (overlay, selectors, play both) | components/ABCompare.tsx, takes-lane wiring |
| REQ-STB-020 | Retake with instruction | P2 | DONE | SCN-STB-021, docs/features/shot-editor.md | tests/retake.int.spec.ts + browser (UI) | requestRetake, retake_of lineage in materialize, per-take UI |
| REQ-STB-018 | Normalize real-model shot plans (break-into-shots robust) | P0 | DONE | USER BUG 2026-07-23 (raw markdown + plan silently dropped) | tests/plan-normalize.spec.ts | src/plan-normalize.ts, service.ts, gen/prompt.ts+provider.ts, script page (Markdown) |
| REQ-STB-019 | Remove a shot (cut) from the storyboard | P1 | DONE | USER 2026-07-23 "how can I remove cuts?" | tests/remove-shot.int.spec.ts | src/service.ts (removeShot), removeShotAction, ✕ Remove cut button |
| REQ-STB-016 | Per-shot reference images on the image script | P1 | DONE | USER spec revisit 2026-07-23 (2d) | tests/shot-refs-and-first-frames.int.spec.ts + browser E2E | migration 0013, service (updateShotRefs), ref-picker UI (page.tsx + updateShotRefsAction) |
| REQ-STB-017 | First frames auto-offered on plan apply | P1 | DONE | USER spec revisit 2026-07-23 (3) | tests/shot-refs-and-first-frames.int.spec.ts | src/service.ts (applyShotPlan), apps/web (applyPlanAction + script page) |
| REQ-STB-015 | Generate from script + prose auto-prompts (no slop) | P1 | DONE | USER FEEDBACK #2 2026-07-23 | tests (prompt prose + scripts) + browser (buttons live; user-driving) | prompt v2, saveScriptsAndGenerateAction |
| REQ-STB-014 | Shot plan authors per-shot scripts (ready image prompts) | P1 | DONE | USER 2026-07-23 directives combined | tests/plan-scripts.int.spec.ts | fixtures+prompt+applyShotPlan (browser pending w/ 015) |
| REQ-STB-013 | Per-shot editable image & video scripts (visible refs) | P1 | DONE | USER FEEDBACK 2026-07-23 | tests/shot-scripts.int.spec.ts + browser | src/service.ts, ../gen/src/prompt.ts, shot-card scripts UI |
| REQ-STB-012 | Video prompt drives script & image prompts with cast | P2 | DONE | USER 2026-07-23, BR-STB-001 | tests/video-prompt.int.spec.ts + browser | src/service.ts, ../gen/src/prompt.ts, web UI |
| REQ-STB-011 | Shot plan proposal materializes and applies | P2 | DONE | `docs/13` §6 ProposeShotPlan/ApplyShotPlan | tests/script.int.spec.ts | src/service.ts |

---

### REQ-STB-001 — Shot duration within config bounds
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-001
- **Statement:** Creating/updating a shot rejects durations outside `config.shot.minSeconds..maxSeconds`.
- **Acceptance criteria:**
  - GIVEN duration 6.5 WHEN CreateShot THEN shot persists with duration 6.5.
  - GIVEN duration 3 or 11 WHEN CreateShot/UpdateShot THEN rejected with `validation_failed` naming the bounds.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-002 — Shots hold a strict total order
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-002
- **Statement:** Each shot has a unique position within its project; new shots append at the end.
- **Acceptance criteria:**
  - GIVEN two created shots THEN positions are 1 and 2; listing returns them in order.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-003 — Single selection per slot / take
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-003
- **Statement:** A shot has at most one selected start frame, one selected end frame, one selected take; selecting replaces the previous selection.
- **Acceptance criteria:**
  - GIVEN take A selected WHEN SelectTake(B) THEN only B is selected.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-004 — Take selectable only when asset ready
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-004
- **Statement:** SelectTake requires the take's video asset status `ready`.
- **Acceptance criteria:**
  - GIVEN a take whose asset is `pending`/`failed` WHEN SelectTake THEN rejected `asset_not_ready`.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-008 — Script versions via draft/revise
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Source:** `docs/13` §6 (DraftScript), BR-STB-005
- **Statement:** DraftScript produces a new immutable script version via GEN (kind `script`); versions increment; content persists with generation provenance.
- **Acceptance criteria:**
  - GIVEN a project with a brief WHEN DraftScript completes THEN script_version v1 exists with non-empty content and generation_id.
  - GIVEN an existing v1 WHEN DraftScript again THEN v2 exists; v1 unchanged.
- **Tests:** `tests/script.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 2)

### REQ-STB-025 — Lyric-synced cut suggestions
- **Status:** DONE · **Stage:** P6 · **Priority:** should · **Owner:** —
- **Raised-by:** USER Lyria epic — "time the change of scene according to song timing lyrics"
- **Source:** REQ-GEN-020 transcripts; INV-STB-001 duration bounds
- **Statement:** When the track transcript exists, the storyboard shows a ♪ MUSIC SYNC panel: section boundaries parsed from [MM:SS] stamps, a greedy pass proposes per-shot duration changes (allowed set only, earlier changes shift later cuts) that land cuts exactly on section changes, with a one-click apply (updateShotDuration, INV-STB-001-validated).
- **Acceptance criteria:**
  - GIVEN a transcript THEN section times parse (0:00 excluded); GIVEN shots+boundaries THEN suggestions land cuts on boundaries; no-op when aligned/unreachable.
  - GIVEN apply THEN durations persist (bounds enforced); existing takes untouched (provenance badges mark stale ones).
- **Tests:** `tests/music-sync.spec.ts` (parse+suggest), `tests/update-duration.int.spec.ts` · browser E2E: Aurora panel showed sections 0:19–2:32, suggested Momentum 6s→8s (cut → 0:19 exactly), applied and persisted · **Code:** `src/music-sync.ts`, service updateShotDuration, applySyncAction + panel · **Log:** LOG 2026-07-23 (slice 22)
- **Deferred / notes:** suggestions are exact-hit greedy (no near-miss tolerance) — extend if real briefs need it. Also closed REQ-STB-024's deferred subtext passthrough (plan/user subtext now renders on TitleCard).

### REQ-STB-024 — Plan-authored animation shots
- **Status:** DONE · **Stage:** P6 · **Priority:** should · **Owner:** —
- **Raised-by:** USER Remotion epic — "generate separate scenes with purely remotion animations (prompt)"
- **Source:** docs/features/animations.md; BR-STB-005 (plan authoring)
- **Statement:** The shot-plan model may flag pure-graphic shots (title cards, end-cards, logo stings) with `animation: {template:"title", text, subtext}`; normalize validates the block (junk dropped), apply persists it on the shot, "Apply + first frames" renders those shots as FREE animation takes instead of buying frames, and the storyboard shows a badge with the animate input prefilled.
- **Acceptance criteria:**
  - GIVEN a plan shot with a valid animation block THEN it normalizes through; invalid blocks drop silently.
  - GIVEN apply THEN shot.animation persists; GIVEN apply+first-frames THEN animation shots enqueue kind `animation` ($0) while filmed shots get frames.
  - GIVEN the storyboard THEN "✦ animation shot" badge + prefilled ✦ Animate text.
- **Tests:** `tests/plan-normalize.spec.ts` (REQ-STB-024 block) · real E2E: gemini-3.6-flash authored "YOUR NEXT ADVENTURE AWAITS" end-card unprompted, stored on apply, rendered free (frame-verified), badge+prefill visible in browser · **Code:** migration 0020, plan-normalize/applyShotPlan, shot-plan prompt schema, applyPlanAction branch, storyboard badge · **Log:** LOG 2026-07-23 (slice 21)
- **Deferred / notes:** subtext not yet passed to requestAnimationTake (title-only); more templates will extend the plan schema.

### REQ-STB-023 — Music brief includes timed lyrics unless instrumental
- **Status:** DONE · **Stage:** P5 · **Priority:** must · **Owner:** —
- **Raised-by:** USER 2026-07-23: "Always generate also lyrics to the song unless it's instrumental" (Lyria epic, docs/85 §Music)
- **Source:** docs/85 §Music; Lyria 3 lyric tags [Verse]/[Chorus]/[Bridge]
- **Statement:** The music brief shall include full timed lyrics with section tags sized to the video duration unless the brief chooses instrumental (then it states "Instrumental — no lyrics"). One brief drives both Suno and Lyria.
- **Acceptance criteria:**
  - GIVEN the brief prompt THEN it demands lyrics with section tags unless instrumental.
  - GIVEN a vocal-leaning idea WHEN generated with the real model THEN the brief contains a LYRICS section with timed tags; instrumental ideas state instrumental explicitly.
- **Tests:** `libs/gen/tests/prompt.spec.ts` + real-model checks (vocal scratch: LYRICS [Intro](0:00–0:05)…; Aurora: "Instrumental only, no vocals") · **Code:** `libs/gen/src/prompt.ts` assembleMusicBriefPrompt · **Log:** LOG 2026-07-23 (slice 20)
- **Deferred / notes:** REQ-GEN-019 (Lyria generation, OQ-114 pricing) and REQ-GEN-020 (MM:SS transcription sync) are PROPOSED in the GEN ledger — next slices of the epic.

### REQ-STB-022 — Reorder shots
- **Status:** DONE · **Stage:** P2 · **Priority:** should · **Owner:** —
- **Raised-by:** last storyboard-doc gap (SCN-STB-010)
- **Source:** SCN-STB-010, INV-STB-002 (`docs/13`)
- **Statement:** A shot can be moved earlier/later among live shots; edges are no-ops; the swap is atomic (position uniqueness honored via temp slot); animatic and export order follow automatically (both read position order).
- **Acceptance criteria:**
  - GIVEN 3 shots WHEN the middle moves up THEN order swaps and persists; edge moves are no-ops.
  - GIVEN soft-deleted neighbors THEN they are skipped (live-only ordering).
  - GIVEN the storyboard THEN ↑↓ on each card work (keyboard-accessible buttons).
- **Tests:** `tests/reorder.int.spec.ts` + browser E2E (Aurora: moved down, verified in DB, restored) · **Code:** `src/service.ts` reorderShot, `apps/web` reorderShotAction + ↑↓ · **Log:** LOG 2026-07-23 (slice 19)
- **Deferred / notes:** drag-and-drop deferred — buttons cover the need and are keyboard-accessible.

### REQ-STB-021 — A/B take comparison
- **Status:** DONE · **Stage:** P2 · **Priority:** could · **Owner:** —
- **Raised-by:** last unbuilt shot-editor outcome (docs/features/shot-editor.md)
- **Source:** `docs/features/shot-editor.md` ("A/B compare two takes side by side")
- **Statement:** When a shot has ≥2 takes, an A/B overlay compares any two side by side with per-side selection and a synchronized "play both"; Escape/close dismisses.
- **Acceptance criteria:**
  - GIVEN <2 takes THEN no compare affordance; GIVEN ≥2 THEN "⇆ A/B compare" in the takes lane.
  - GIVEN the overlay THEN both videos render with A/B selectors; "play both" restarts both from 0.
- **Tests:** UI-only — browser E2E (scratch shot with 2 takes: overlay verified, then scratch removed) · **Code:** `apps/web/components/ABCompare.tsx`, takes-lane wiring · **Log:** LOG 2026-07-23 (slice 18)
- **Deferred / notes:** frame-accurate sync scrubbing not needed at 4–8s clip lengths.

### REQ-STB-020 — Retake with instruction
- **Status:** DONE · **Stage:** P2 · **Priority:** should · **Owner:** —
- **Raised-by:** QA sweep 2026-07-23 — schema/routing/materialization existed but no service or UI (SCN-STB-021 unbuilt)
- **Source:** SCN-STB-021, `docs/features/shot-editor.md`
- **Statement:** Any take can be retaken with a short instruction: the new generation uses the SOURCE take's conditioning frame (not the current selection), appends the instruction ("… Keep everything else the same."), lands in the same shot with `retake_of` lineage, and is priced like a take.
- **Acceptance criteria:**
  - GIVEN a take WHEN retaken THEN the generation is kind `retake`, its prompt contains the instruction, and its start-frame ref equals the source take's conditioning frame.
  - GIVEN the retake materializes THEN the new take has `retake_of` = source take and the same shot (INV-STB-005).
  - GIVEN a blank instruction THEN rejected `validation_failed`.
- **Tests:** `tests/retake.int.spec.ts` (mock ring) · UI verified in browser (input + ↻ per take, lane lockout applies) · **Code:** `src/service.ts` requestRetake + materialize lineage, `apps/web` retakeAction + per-take form · **Log:** LOG 2026-07-23 (slice 17)
- **Deferred / notes:** real-video E2E stays behind RUN_REAL_VIDEO per §9.8 spike budget (pending user go-ahead); custom video scripts get the instruction appended after the verbatim script.

### REQ-STB-018 — Normalize real-model shot plans
- **Status:** DONE · **Stage:** MVP · **Priority:** must · **Owner:** —
- **Raised-by:** USER BUG 2026-07-23: "break into shots does not work and in overall text is raw markdown"
- **Source:** BR-STB-005 (`docs/13`), OQ-113 (model output variance)
- **Statement:** Shot-plan output from the real model shall be normalized (key variants, duration snap/clamp to allowed set, junk dropped) before materialization; script text shall render as markdown; failed text generations shall be visible on the script page.
- **Acceptance criteria:**
  - GIVEN model output in canonical or variant shapes (top-level array, `duration`/`durationSeconds`, `name`, snake_case prompts, `plan` key) WHEN normalized THEN usable shots result; garbage → [].
  - GIVEN odd durations (5, 12) WHEN normalized THEN snapped/clamped to allowed {4,6,8}.
  - GIVEN a stored proposal in raw model shape WHEN rendered or applied THEN it does not crash and applies normalized.
- **Tests:** `tests/plan-normalize.spec.ts` (10 cases) · **Code:** `src/plan-normalize.ts` (used in service + web), `libs/gen/src/provider.ts` (fence-strip), `libs/gen/src/prompt.ts` (explicit JSON shape) · **Log:** LOG 2026-07-23 (slice 9)
- **Deferred / notes:** browser-verified on user's real project (plan applied, 6 shots, frames generating).

### REQ-STB-019 — Remove a shot (cut)
- **Status:** DONE · **Stage:** MVP · **Priority:** must · **Owner:** —
- **Raised-by:** USER 2026-07-23: "how can I remove cuts?"
- **Source:** `docs/13-storyboard.md` (add/split/remove shots), INV-STB-007 (paid-work protection)
- **Statement:** The editor shall remove a shot from the storyboard (soft delete cascading to its frame candidates and takes; media assets retained); shots with a selected take require explicit confirmation.
- **Acceptance criteria:**
  - GIVEN a shot WHEN removed THEN listShots omits it and its candidates are soft-deleted; assets stay.
  - GIVEN a shot with a selected take WHEN removal attempted without confirm THEN rejected `conflict`; with confirm THEN removed.
  - GIVEN an already-removed shot WHEN removed again THEN `not_found`.
- **Tests:** `tests/remove-shot.int.spec.ts` · **Code:** `src/service.ts` (removeShot; also fixed createShot position bug vs soft-deleted rows), `apps/web` removeShotAction + per-card ✕ button · **Log:** LOG 2026-07-23 (slice 9)
- **Deferred / notes:** nicer confirm dialog (two-step) deferred — button label carries the warning.

### REQ-STB-016 — Per-shot reference images on the image script
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Raised-by:** USER spec revisit 2026-07-23 ("every shot contains … possible reference images for image generation")
- **Statement:** Each shot can select which reference images attach to ITS image generation (from cast refs + any project image), shown and toggleable on the image script; default = current whole-cast behavior.
- **Acceptance criteria:**
  - GIVEN a shot with no per-shot selection (NULL) WHEN a frame generates THEN the whole cast's ref images attach (unchanged default).
  - GIVEN `updateShotRefs` with a subset WHEN a frame or take generates THEN only that subset attaches (snapshot `refAssetIds`); selected start-frame attachment on takes unchanged.
  - GIVEN `updateShotRefs(null)` THEN behavior returns to the whole-cast default.
  - GIVEN a non-ready or non-image asset id WHEN `updateShotRefs` THEN rejected `asset_not_ready`.
- **Tests:** `tests/shot-refs-and-first-frames.int.spec.ts`
- **Code:** migration `0013_shot_refs.sql`, `src/schema.ts` (shot.refAssetIds), `src/service.ts` (updateShotRefs, resolveShotRefs in requestFrame/requestTake)
- **Log:** LOG 2026-07-23 (slice 7)
- **Deferred / notes:** per-shot ref checkbox UI on the storyboard page lands separately (another agent integrates `apps/web/app/p/[id]/page.tsx`).

### REQ-STB-017 — First frames auto-offered on plan apply
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Raised-by:** USER spec revisit 2026-07-23 ("You can generate first set of images already with the image script")
- **Statement:** Applying a shot plan offers one-click generation of the first frames from all authored image scripts (queue batch); user then reprompts individual scripts before making video.
- **Acceptance criteria:**
  - GIVEN a proposal WHEN `applyShotPlan` THEN it returns the created shot ids in proposal order.
  - GIVEN the script page WHEN "Apply + first frames" is submitted (form field `generateFrames=1`) THEN the plan applies AND a start-frame generation is requested for every created shot and dispatched via the queue/inline drain.
  - GIVEN plain "Apply N shots" THEN behavior is unchanged (no generations).
- **Tests:** `tests/shot-refs-and-first-frames.int.spec.ts`
- **Code:** `src/service.ts` (applyShotPlan → `Promise<string[]>`), `apps/web/app/actions.ts` (applyPlanAction generateFrames arm), `apps/web/app/p/[id]/script/page.tsx` (two submit buttons)
- **Log:** LOG 2026-07-23 (slice 7)

### REQ-STB-015 — Generate from script + prose auto-prompts
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Raised-by:** USER FEEDBACK #2 ("How can I call image generation with the image prompt? Also, image prompt is horrible slop.")
- **Statement:** (a) The scripts form carries **Save & generate frame** / **Save & generate take** — editing a prompt and firing generation is one gesture. (b) Auto-composed frame/take prompts are natural cinematic prose (no ENTITY:/SHOT:/FORMAT: label scaffolding); custom text remains verbatim.
- **Acceptance criteria:**
  - GIVEN an edited image script WHEN Save & generate frame THEN one action persists the script and generates from it.
  - GIVEN auto mode THEN the frame prompt reads as prose containing synopsis/subject/cast naturally and contains no "ENTITY:"/"SHOT:"/"FORMAT:" labels.
- **Tests:** — · **Code:** — · **Log:** —

### REQ-STB-014 — Shot plan authors per-shot scripts (ready image prompts)
- **Status:** READY · **Stage:** P1 · **Priority:** must
- **Raised-by:** USER 2026-07-23 ("generate a script and ready image prompts using potentially the assets" + "every clip MUST have an image script … and video script")
- **Source:** `docs/13` §6, REQ-STB-013 fields
- **Statement:** ProposeShotPlan asks the model for an explicit `imagePrompt` and `videoPrompt` per shot — rich, cast-referencing, production-ready prompts. ApplyShotPlan writes them into the shots' script fields, so every planned clip lands with authored scripts (editable per REQ-STB-013), not just direction fields.
- **Acceptance criteria:**
  - GIVEN a proposal THEN every planned shot carries non-empty imagePrompt and videoPrompt (mock + real ring).
  - GIVEN apply THEN the created shots have those scripts set, and frame/take generation uses them verbatim.
  - Browser: applying a plan shows shot cards with IMAGE/VIDEO SCRIPT · custom pre-filled.
- **Tests:** — · **Code:** — · **Log:** —

### REQ-STB-013 — Per-shot editable image & video scripts (visible refs)
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Raised-by:** USER FEEDBACK 2026-07-23 ("Every clip MUST have an image script (with reference images added) and video script. How can you otherwise try to get them right?")
- **Source:** `docs/06` §5 ("what the model saw" made editable), BR-STB-002
- **Statement:** Every shot exposes an **image script** and a **video script**: editable prompt texts shown with the reference images that will attach (entity refs; selected start frame for video). Empty = auto-composed from direction+cast (shown as the effective default). Once set, the user's text is used verbatim as the creative body (format line + reference attachment still applied).
- **Acceptance criteria:**
  - GIVEN a custom image script WHEN a frame generates THEN the snapshot prompt starts with the custom text and contains no auto-assembled direction block; entity ref images still attach.
  - GIVEN a custom video script WHEN a take generates THEN likewise, and the selected start frame still conditions the video.
  - GIVEN no custom script THEN behavior is unchanged (auto-composed).
  - Browser: shot card shows both scripts with ref thumbnails; editing + generating uses the edited text.
- **Tests:** `tests/shot-scripts.int.spec.ts` + browser E2E (custom script → verbatim snapshot) · **Code:** migration 0012, `updateShotScripts`, customPrompt in assembly, scripts UI on every shot card · **Log:** LOG 2026-07-23 (slice 6)

### REQ-STB-012 — Video prompt drives script & image prompts with cast
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Raised-by:** USER 2026-07-23 ("add the prompt for video, that then gemini-3.6-flash can generate a script and ready image prompts using potentially the assets")
- **Source:** BR-STB-001, `docs/13` §7, `docs/14` §5
- **Statement:** The project carries an editable **video prompt** (brief). Script and shot-plan generation consume it AND the attached cast (entities as CAST blocks), so `gemini-3.6-flash` writes the script and per-shot directions — the ready image prompts — around the user's assets. The UI exposes the prompt at project creation and on the script page.
- **Acceptance criteria:**
  - GIVEN a video prompt and attached cast WHEN DraftScript/ProposeShotPlan enqueue THEN the stored prompt snapshot contains the prompt text and a CAST block per entity.
  - GIVEN the script page WHEN the prompt is edited and saved THEN subsequent drafts use the new text (browser).
- **Tests:** `tests/video-prompt.int.spec.ts` + browser E2E · **Code:** `../gen/src/prompt.ts` (CAST blocks), `src/service.ts` (cast into script/plan/music), prompt UI (create + script page) · **Log:** LOG 2026-07-23 (slice 5)

### REQ-STB-011 — Shot plan proposal materializes and applies
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Source:** `docs/13` §6 (ProposeShotPlan / ApplyShotPlan), INV-STB-001/002
- **Statement:** ProposeShotPlan (kind `shot_plan`) yields a stored proposal of shots (title, direction, duration within bounds); ApplyShotPlan creates those shots appended in order and marks the proposal applied. MVP: additive only; update/remove diff arms with paid-work protection follow in REQ-STB-007.
- **Acceptance criteria:**
  - GIVEN a script version WHEN ProposeShotPlan completes THEN a proposal exists with ≥3 shots, each duration within config bounds.
  - GIVEN a proposal WHEN ApplyShotPlan THEN shots exist in proposal order at the storyboard tail and the proposal is `applied`.
- **Tests:** `tests/script.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 2)

### REQ-STB-010 — Music brief: generate Suno prompt
- **Status:** DONE · **Stage:** P3 · **Priority:** should
- **Source:** BR-STB-007, `docs/17` §1 (manual Suno round-trip)
- **Statement:** RequestMusicBrief generates Suno-ready prompt text from title/brief/target length (+ latest script when present) via GEN kind `music_brief`; the project keeps one current brief (regenerate replaces, provenance retained via generation id). Track attach + mix modes are separate arms (need REQ-AST-004 uploads) — deferred explicitly.
- **Acceptance criteria:**
  - GIVEN a project WHEN RequestMusicBrief completes THEN a music_brief row exists whose prompt mentions the target duration.
  - GIVEN an existing brief WHEN regenerating THEN the row is replaced (new generation id), not duplicated.
- **Tests:** `tests/music.int.spec.ts` + browser E2E · **Code:** `src/service.ts` (requestMusicBrief/getMusicBrief), migration 0006 · **Log:** LOG 2026-07-23 (slice 3)

### REQ-STB-009 — Candidate removal (soft, unselected only)
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Source:** POL-STB-002/003 (user requirement #4 removal arm), INV-AST-003
- **Statement:** Users may soft-remove frame candidates and takes that are not currently selected; removed candidates vanish from strips and the animatic but their assets remain in storage (provenance sacred). Removing a selected candidate is rejected — unselect first.
- **Acceptance criteria:**
  - GIVEN an unselected frame candidate or take WHEN removed THEN it is soft-deleted (deletedAt), disappears from listCandidates, and its asset stays `ready`.
  - GIVEN a selected candidate WHEN removal attempted THEN rejected `conflict` and nothing changes.
- **Tests:** `tests/remove.int.spec.ts` + browser E2E · **Code:** `src/service.ts`, ✕ remove UI · **Log:** LOG 2026-07-23 (slice 4)

### REQ-STB-006 — Frame re-selection keeps takes + provenance
- **Status:** DONE · **Stage:** P2 · **Priority:** should · **Owner:** —
- **Raised-by:** seeded from `docs/13-storyboard.md`; promoted this slice
- **Source:** INV-STB-006
- **Statement:** Selecting a different start frame shall never destroy or regenerate existing takes; each take's conditioning frame remains queryable (takeProvenance) and the UI marks takes generated from a non-current frame.
- **Acceptance criteria:**
  - GIVEN a take generated from frame A WHEN frame B is selected THEN the take survives, its selection is untouched, and takeProvenance returns frame A's asset.
  - GIVEN the storyboard WHEN a take's conditioning frame ≠ the current selection THEN a "from older frame" badge shows.
- **Tests:** `tests/frame-reselect.int.spec.ts` · **Code:** `src/service.ts` (takeProvenance), `apps/web` takes strip badge · **Log:** LOG 2026-07-23 (slice 13)
- **Deferred / notes:** —

### REQ-STB-007 — Shot-plan apply replaces unpaid shots, protects takes
- **Status:** DONE · **Stage:** P2 · **Priority:** must · **Owner:** —
- **Raised-by:** promoted this slice; user-visible pain — plans stacked (user's board showed 5 stale + 6 new shots)
- **Source:** INV-STB-007, BR-STB-005 (`docs/13`, script-studio re-plan)
- **Statement:** Applying a shot plan shall soft-remove existing shots that carry no takes and append the plan's shots; shots with takes (paid work) are preserved untouched.
- **Acceptance criteria:**
  - GIVEN unpaid shots WHEN a plan is applied THEN they are soft-removed and the new shots appended.
  - GIVEN a shot with a take WHEN a plan is applied THEN it survives with its position, selection, and candidates intact.
  - GIVEN the Apply buttons THEN the replace behavior is labeled.
- **Tests:** `tests/replan-protect.int.spec.ts` · browser E2E (Replan Test project: 5 → replaced by 4, no stacking) · **Code:** `src/service.ts` (applyShotPlan), script page hint · **Log:** LOG 2026-07-23 (slice 14)
- **Deferred / notes:** full selective diff UI (per-shot toggle before apply) deferred — this replace-unpaid MVP covers the stacking pain; frames on unpaid shots are accepted losses (cheap), takes are the protected asset.

### REQ-STB-005 — Take belongs to its shot, never moved
- **Status:** DONE · **Stage:** P2 · **Priority:** should · **Owner:** —
- **Raised-by:** seeded from `docs/13-storyboard.md`; promoted this slice
- **Source:** INV-STB-005
- **Statement:** A take is permanently bound to the shot it was generated for: cross-shot addressing is rejected and the service surface exposes no operation that mutates a take's shot binding.
- **Acceptance criteria:**
  - GIVEN a take on shot A WHEN selected through shot B THEN rejected `not_found`; through shot A THEN selected.
  - GIVEN the STB service surface THEN no move/reassign/transfer operation exists.
- **Tests:** `tests/take-binding.int.spec.ts` · **Code:** `src/service.ts` selectTake (`// INV-STB-005`) · **Log:** LOG 2026-07-23
- **Deferred / notes:** —

### REQ-STB-026 — Archetype selection injects directing recipe
- **Status:** DONE · **Stage:** P7 · **Priority:** should · **Owner:** —
- **Raised-by:** USER directing/taste epic (docs/87)
- **Source:** docs/87-directing-playbook.md
- **Statement:** A project selects a directing archetype (6 recipes in `config/archetypes.ts`, tunable without code changes; null = freeform); the recipe's DIRECTING block reaches script AND plan prompts, planBias the plan prompt, musicBias the music-brief prompt — all via the shared textInput path with provenance in snapshots.
- **Acceptance criteria:**
  - GIVEN directing/planBias/musicBias in textInput THEN each lands in exactly its prompts; omitted = unchanged (unit-tested).
  - GIVEN a project with an archetype WHEN drafting THEN the snapshot prompt contains the recipe (E2E-verified: Brand pulse block in Aurora's draft snapshot).
  - GIVEN the script page THEN a directing select persists the choice.
- **Tests:** `libs/gen/tests/prompt.spec.ts` (REQ-STB-026) · snapshot E2E · browser (select present; submit verified server-side — extension click-drop) · **Code:** `libs/shared/src/config/archetypes.ts`, migration 0021, STB recipeFor ×3 injection, PRJ setProjectArchetype, script-page select · **Log:** LOG 2026-07-23 (slice 24)
- **Deferred / notes:** archetype defaults (audio mode, shot-length caps) and per-archetype eval renders belong to REQ-STB-027.

### REQ-STB-027 — Archetype defaults
- **Status:** DONE · **Stage:** P7 · **Priority:** could · **Owner:** —
- **Statement:** Selecting an archetype applies its recipe defaults to the project (v1: audioMixMode — music for music-led archetypes, mix where native sound matters).
- **Tests:** E2E: product-launch → audioMixMode mix; brand-pulse → music · **Code:** archetypes defaults, PRJ setProjectArchetype · **Log:** LOG (slice 25)
- **Deferred / notes:** per-archetype eval renders (taste review, docs/87) remain before the epic is DONE — tracked here.

### REQ-STB-028 — Music-led planning
- **Status:** DONE · **Stage:** P7 · **Priority:** should · **Owner:** —
- **Statement:** When the project's track has a transcript, the shot-plan prompt includes it with instructions to align shot boundaries to the [MM:SS] sections and to carry matching lyric lines into animation-shot text.
- **Tests:** prompt.spec REQ-STB-028 (block + alignment + lyric-into-animation instructions; absent when no transcript) · snapshot E2E on Aurora (transcript + DIRECTING both present in the plan prompt) · **Code:** prompt transcript block, proposeShotPlan getMusicBrief wiring · **Log:** LOG (slice 25)
- **Deferred / notes:** full lyrics-FIRST orchestration (one-click: brief→track→transcript→plan) is UX sugar over these pieces — add if the manual sequence proves clumsy.

### REQ-STB-029 — Route-aware shot durations
- **Status:** DONE  ·  **Stage:** P7  ·  **Priority:** should  ·  **Owner:** —
- **Raised-by:** REQ-GEN-023 deferral (2026-07-24): omni route supports free-form durations but STB still snapped to Veo's {4,6,8}
- **Source:** INV-STB-001 (cap follows provider limits); providerLimits.omniVideo
- **Statement:** The shot-duration palette follows the active video route via `shotDurationPolicy()`: Veo → {4,6,8}s cap 8; omni → every integer 4–10s. Applied in plan normalization, duration validation, music-sync suggestions, and the shot-plan prompt schema.
- **Acceptance criteria:**
  - GIVEN the default route THEN policy/normalize/sync behave exactly as before (regression tests + browser check).
  - GIVEN videoRoute=omni THEN a planned 5s or 10s shot survives normalization (12 clamps to 10), a 7s music-sync boundary hit becomes suggestible, and the plan prompt advertises durationS 4|5|…|10.
- **Tests:** `tests/duration-policy.spec.ts` (7) · **Code:** shared config `shotDurationPolicy`, `src/plan-normalize.ts`, `src/music-sync.ts`, `src/service.ts` assertDuration, `../gen/src/prompt.ts` plan schema · **Log:** LOG 2026-07-24
- **Deferred / notes:** UI duration picker still free-numeric (validation enforces policy server-side); sub-4s cuts untested on omni — palette floor stays at shot.minSeconds.

### REQ-STB-030 — Route-aware UI
- **Status:** DONE  ·  **Stage:** P7  ·  **Priority:** should  ·  **Owner:** —
- **Raised-by:** BACKLOG 2026-07-24 — production #2 exposed the split-brain: a 10s omni shot's take button advertised the veo-snapped "$0.80" while $1.01 was billed
- **Source:** REQ-GEN-023 / REQ-STB-029 follow-through; INV-GEN-003 (costs must be honest)
- **Statement:** The storyboard surfaces the active take route (badge with explainer) and estimates take costs via the shared `estimateTake()` — which returns the duration the route will ACTUALLY run (veo snaps, omni clamps) and its price; when that differs from the shot's duration, the button says so.
- **Acceptance criteria:**
  - GIVEN veo route THEN a 10s shot's button reads "≈ $0.80 · 8s" with an explanatory title; a 6s shot reads plain "≈ $0.60" (browser-verified).
  - GIVEN omni route THEN estimateTake(10) = 10s/$1.0136 and 12 clamps to the cap (unit).
  - GIVEN either route THEN the header badge names it, with switch instructions in the tooltip.
- **Tests:** `libs/gen/tests/omni-video.spec.ts` (REQ-STB-030 block) + browser E2E · **Code:** `libs/gen/src/cost.ts` estimateTake, `apps/web/app/p/[id]/page.tsx` (badge + button) · **Log:** LOG 2026-07-24
- **Deferred / notes:** route stays env-level (no per-project route picker yet — needs a product decision on mixed-route projects).

### REQ-STB-031 — Storyboard players audible
- **Status:** IN_REVIEW  ·  **Stage:** P7  ·  **Priority:** must  ·  **Owner:** —
- **Raised-by:** USER BUG 2026-07-24: "Kaiju video has no sound"
- **Source:** docs/06 (players surface real output); takes carry native Veo/Omni audio, exports carry the mix
- **Statement:** Storyboard tile players are audible by default — diagnosis showed the media was never silent (take aac −, export mp3 mean −15.8 dB); a hard-coded `muted` on the tile <video> made the whole product seem soundless.
- **Acceptance criteria:**
  - GIVEN the storyboard WHEN served THEN tile <video> elements carry no muted attribute (verified in rendered HTML).
  - GIVEN a take tile WHEN played THEN its native audio is heard (user re-test).
- **Tests:** rendered-markup check + browser · **Code:** `apps/web/app/p/[id]/page.tsx` tile player · **Log:** LOG 2026-07-24
- **Deferred / notes:** share page and A/B compare were already unmuted; animatic supplies its own music track.

### REQ-STB-032 — Lyric-shot alignment
- **Status:** BLOCKED · **Stage:** P8 · **Blocking OQ:** OQ-115
- **Source:** Neon Rivers full lyric-video production (2026-07-24) — lyric shots placed by storyboard order, not sung-at timestamps; long-intro tracks put words far ahead of the vocals.
- **Options on the table (docs/08 OQ-115):** (a) fill-to-timestamp planning · (b) export-time track start-offset · (c) both, archetype-chosen. Recommendation recorded: (c), building (b) first. Unblocks on the human call.

### REQ-STB-033 — Cast visibility everywhere
- **Status:** IN_REVIEW · **Stage:** P8 · **Priority:** must
- **Raised-by:** USER 2026-07-24: "library and selection of video cast should be more prominent and available from all the views. Now when going to script studio, I have no idea what content is being included in the prompt" + "you should be able to go to them from projects view"
- **Statement:** A shared CastBar (checkbox chips with ref thumbnails, a `profile` badge for entities whose long-form background feeds text prompts, Save cast, library link) renders on BOTH the storyboard and script studio — the script-studio copy is labeled "these members (and their profiles) are included in script, shot-plan and music prompts". The projects home header links to the library.
- **Acceptance criteria:**
  - GIVEN script studio THEN the cast bar shows every org entity with thumbnail + checked state + profile badges, editable in place (browser-verified on ModernPath launch — surfaced that its cast was empty, the exact previously-invisible state).
  - GIVEN the storyboard THEN the same component renders (upgraded from the plain checkbox list).
  - GIVEN the projects view THEN "library — cast & brand →" is in the header (browser-verified).
- **Tests:** browser E2E across the three views · **Code:** `apps/web/components/CastBar.tsx`, storyboard + script pages, `app/page.tsx` · **Log:** LOG 2026-07-24
- **Deferred / notes:** per-shot cast overrides UI (direction.entityIds) still storyboard-only.

### REQ-STB-034 — First take auto-selects
- **Status:** IN_REVIEW · **Stage:** P8 · **Priority:** must
- **Raised-by:** USER 2026-07-24: "why can't I export / generate the video from here?" — all 5 takes existed but none selected; export honestly reported "0 ready · skip 5", which reads as broken
- **Source:** INV-STB-003/004 (single selection, ready-only) — selection stays user-owned; this only fills the empty state
- **Statement:** When a take materializes onto a shot with NO selected take, it auto-selects (one candidate = no creative choice yet). An existing selection is never overridden; users can reselect/deselect as before.
- **Acceptance criteria:**
  - GIVEN an unselected shot WHEN its take materializes THEN selectedTakeId points at it (int test).
  - GIVEN a shot with a selected take WHEN a second take materializes THEN the selection is unchanged (int test).
  - GIVEN ModernPath launch THEN the header reads 5/5 generated and Export is available (browser-verified after backfilling the 5 stranded takes).
- **Tests:** `tests/take-binding.int.spec.ts` REQ-STB-034 block + browser · **Code:** `src/service.ts` materializeGenerationOutput take branch · **Log:** LOG 2026-07-24
- **Deferred / notes:** refines slice-38's "never auto-select on the user's behalf": that decision covered AGENT-initiated repair takes; user-initiated takes filling an empty slot are the user's own action. Frames keep explicit selection (2 candidates arrive by design).

### REQ-STB-035 — Script-studio generation indicators
- **Status:** IN_REVIEW · **Stage:** P8 · **Priority:** must
- **Raised-by:** USER 2026-07-24: the script studio gave zero signal while script/plan/brief/track/transcript generations ran (queue mode finishes AFTER the action returns; only the storyboard had indicators)
- **Statement:** The script page queries active text/music generations and shows a pulsing accent banner naming what's generating ("updates live when it lands"); the five triggering buttons (Draft/Redraft, Break into shots, brief, ♫ track, ⏱ transcribe) lock and relabel while their kind is active — no signalless waits, no double-spend.
- **Acceptance criteria:**
  - GIVEN a queued/running text-or-music generation THEN the banner renders naming its kind (verified: synthetic queued script row → banner present in served HTML; RSC text-splitting noted for future greps).
  - GIVEN an active kind THEN its button is disabled with an in-progress label.
- **Tests:** rendered-HTML verification · **Code:** `apps/web/app/p/[id]/script/page.tsx` · **Log:** LOG 2026-07-24
- **Deferred / notes:** storyboard already had per-shot pulses + RECENT GENERATIONS; this closes the gap for the text lanes.

### REQ-STB-036 — Animation template variety: plan varies, user chooses
- **Status:** IN_REVIEW · **Stage:** P8 · **Priority:** must
- **Raised-by:** USER 2026-07-24: "the animations are really limited, always repeating one. Can we have some variability and even possibility to choose?"
- **Statement:** The shot planner knows the full full-frame template set (`fullFrameAnimationTemplates` in shared config: title · kinetic · stat · quote · checklist), is instructed to VARY templates across animation shots, and its choice survives normalization, enqueue, and executor dispatch; the storyboard picker offers every template plus a subtext field (quote attribution / checklist items / stat subline). Root cause fixed: the executor collapsed every non-"kinetic" template to "title".
- **Acceptance criteria:**
  - GIVEN a planned animation with template stat/quote/checklist THEN normalization keeps it; unknown templates drop the animation (shot stays filmed).
  - GIVEN the plan prompt THEN it lists all five templates and tells the model to vary them.
  - GIVEN the picker THEN all five templates and the subtext field are submittable and reach the renderer.
- **Tests:** `libs/stb/tests/plan-normalize.spec.ts` (REQ-STB-036 block) · `libs/gen/tests/prompt.spec.ts` (template-set + vary) · served-HTML check (all 5 options render on the storyboard)
- **Code:** `libs/shared/src/config/limits.ts` (template list), `libs/gen/src/prompt.ts` (schema + guidance), `libs/stb/src/plan-normalize.ts`, `libs/stb/src/service.ts` (subtext forwarding), `libs/gen/src/executor.ts` (dispatch fix), `apps/web/app/actions.ts`, `apps/web/app/p/[id]/page.tsx`
- **Log:** LOG 2026-07-24 · **Deferred / notes:** per-template prop editors (e.g. per-item checklist rows) later; REQ-ANM-006 owns the new compositions.

### REQ-STB-037 — One workspace: rail + focused shot + script/music/cast/output drawer
- **Status:** IN_REVIEW · **Stage:** P8 · **Priority:** must
- **Raised-by:** USER 2026-07-25 UX review: "The controls and flow does not seem intuitive, I need to navigate between the screens, scroll up and down etc. Especially when I need to edit something, e.g. script or music, it's really bad experience as script view changes them, but I cant control easily the music etc on editor. Also going up to generate the video etc is quirky, looking and comparing videos difficult, cant add my own scenes or change their order etc. Weird animatic seems useful with music, but it's too separate etc. Maybe rather use some sidebar/floating stuff etc?"
- **Statement:** The project is one workspace, not two scrolling pages. A sticky command bar keeps title · progress · spend · animatic · export always reachable; a left rail lists every shot (status dot, thumbnail, duration, live "working" pulse) and focuses one at a time; the stage shows that single shot with its selected take playing large, its takes side by side, frames, prompts and per-shot refs; a right drawer holds Script · Music · Cast · Output so the script, brief, track and export settings are editable without leaving the board. `/p/:id/script` redirects into the workspace. Layout state (focused shot, open panel, panel width) survives server-action re-renders via sessionStorage.
- **Acceptance criteria:**
  - GIVEN a project WHEN opened THEN the command bar, shot rail and stage render without page-level scrolling of the chrome, and export is reachable without scrolling.
  - GIVEN the Music (or Script) panel WHEN opened THEN brief/track/transcribe (or prompt/script/plan) controls operate while a shot stays on the stage.
  - GIVEN a shot with 2+ takes THEN the takes render side by side at a size where they can be judged, with select/retake/overlay per take.
  - GIVEN a shot removed by an action THEN the stage falls back to the first shot rather than blanking.
  - GIVEN `/p/:id/script` THEN it redirects to the workspace (old links keep working).
- **Tests:** `libs/stb/tests/board.spec.ts` (status + progress rules, red-first) · browser walkthrough on ModernPath Goes To QStock: rail focus, Script panel, Music panel, film panel with animatic, shot 13 two-take compare, `/script` → 200 after redirect
- **Code:** `apps/web/components/Workspace.tsx`, `libs/stb/src/board.ts`, `apps/web/app/p/[id]/page.tsx` (rewrite), `apps/web/app/p/[id]/script/page.tsx` (redirect)
- **Log:** LOG 2026-07-25
- **Deferred / notes:** drag-to-reorder in the rail (↑↓ per shot for now) → REQ-STB-038 PROPOSED; inserting a shot at a position (append + reorder today); floating/detachable panels and multi-select take compare beyond the existing A/B overlay.

### REQ-STB-038 — Reorder shots by drag or ▲▼
- **Status:** IN_REVIEW · **Stage:** P9 · **Priority:** should
- **Raised-by:** USER 2026-07-25: "how can I actually change the order of the clips? I cant see up/down arrows?" — the ↑↓ pair existed only in the stage header, which scrolls off above the player, so from the rail the order looked fixed.
- **Statement:** A shot's place in the cut shall be changeable from where the order is *shown*: every rail row carries a `⋮⋮` grip and an always-visible ▲/▼ pair (disabled at the ends), and clips on the timeline are draggable along the axis. Both paths issue ONE positional move (`moveShotToIndex`), not a chain of neighbour swaps, and the animatic, timeline and export order follow immediately.
- **Acceptance criteria:**
  - GIVEN four shots WHEN the last is moved to index 0 THEN order is D,A,B,C in one call.
  - GIVEN a move forward past later siblings THEN the target index counts the list WITHOUT the moving shot (A→2 in A,B,C,D gives B,C,A,D).
  - GIVEN an out-of-range index (99, −5) THEN it clamps instead of throwing; moving to its current index is a no-op.
  - GIVEN a project where a shot was removed (its position stays reserved by the soft-deleted row) WHEN a live shot is moved THEN the renumber reuses only the slots the live shots occupy — no unique(project_id, position) collision.
  - GIVEN positions after any move THEN they stay contiguous in list order (INV-STB-002).
  - GIVEN a drag over a rail row's lower half or a clip's right half THEN an accent drop line marks the landing gap and the dragged element dims; dragend clears both.
- **Tests:** `tests/move-shot.int.spec.ts` (10)
- **Code:** `src/service.ts` (`moveShotToIndex`) · `apps/web/app/actions.ts` (`moveShotTo`, `moveShotAction`) · `apps/web/components/Workspace.tsx` (rail grip/arrows) · `apps/web/components/Timeline.tsx` (clip drag)
- **Log:** see LOG 2026-07-25
- **Deferred / notes:** inserting a *new* shot at a position (still append-then-move); keyboard-only reorder (the ▲▼ buttons are focusable, but there is no alt+↑/↓ shortcut); dragging a clip's edge to resize → REQ-STB-040 notes. The old neighbour-swap `reorderShotAction` stays exported for the animatic/older callers.

### REQ-STB-039 — Music timeline: clips on the track's time axis
- **Status:** IN_REVIEW · **Stage:** P8 · **Priority:** must
- **Raised-by:** USER 2026-07-25: "somehow it would be nice to see the music timing within the clips, like traditional video editors do? Because if I e.g. add new clip, it might outsync the video."
- **Statement:** A timeline strip under the command bar puts the cut on a real time axis: every clip drawn to scale (status-tinted, click to focus), the track's section changes (MM:SS transcript, REQ-GEN-020) as ticks across the clips with a thinned ruler, `cut` vs `track` lengths, drift (`▲ cut runs Ns past the track` / `◂ Ns of track unused`) and an off-beat count (`3/5 cuts off the beat`). Each shot also states its own `0:08 → 0:12 in the cut` and `♪ on/off the beat`. The axis follows the CUT: leftover track is drawn to scale only up to a third of the cut, then collapses to a `⋯ +M:SS track` chip, because a 2:55 track against a 0:27 cut squeezed every clip into 15% of the width.
- **Acceptance criteria:**
  - GIVEN shots in order THEN each block's start/end is its cumulative position and the total equals the cut length.
  - GIVEN a transcript THEN cuts landing exactly on a section change are marked, and the rest are counted as off-beat.
  - GIVEN a clip inserted or lengthened early THEN later cuts lose their boundary alignment and the off-beat count rises (verified live: 3/5 → 5/5 after +1s on clip 1).
  - GIVEN a track longer/shorter than the cut THEN drift is reported with the direction stated; no track ⇒ no drift claim.
- **Tests:** `libs/stb/tests/timeline.spec.ts` (9, red-first) · browser on Neon Rivers (2:55 track / 0:27 cut): 5 legible clips, boundary ticks at 0:23/0:27/0:32/0:34, collapsed `⋯ +2:27 track` tail, off-beat count flip on edit
- **Code:** `libs/stb/src/timeline.ts`, `apps/web/components/Timeline.tsx`, `apps/web/components/Workspace.tsx`, `libs/ast/src/probe.ts` (ffprobe duration), `libs/ast/src/uploads.ts` + `libs/gen/src/executor.ts` (record audio duration), `apps/web/scripts/backfill-audio-durations.ts`
- **Log:** LOG 2026-07-25
- **Deferred / notes:** `asset.duration_s` was NULL for every audio row, so drift could never render — now probed at upload/generate and backfilled (17/17 existing tracks). Waveform rendering, a scrubbing playhead across clips, and drag-the-edge trimming are not built; ticks come from section stamps, not beat detection.

### REQ-STB-048 — The plan casts the film; missing characters get a portrait
- **Status:** IN_REVIEW · **Stage:** P9 · **Priority:** must
- **Raised-by:** USER 2026-07-27: "the other characters than Pasi in this movie are not kept. In the script planning, I think that director should think of cast and list them, allowing to generate images for other cast needed in this movie… Maybe allow either adding a image for character or generate it?"
- **Statement:** The shot plan shall name every recurring body the film puts on screen, and anyone without a reference image shall be castable from the workspace — by generating a portrait from the planner's appearance line, or by uploading one. Reference images are the only mechanism of character consistency, so a character nobody casts is re-invented in every shot; in `Synchronized Drink` the model gave up and drew Pasi twice.
- **Acceptance criteria:**
  - GIVEN the shot-plan prompt THEN it requests a `cast` list with name, kind, description and a concrete repeatable `appearance`, demands unnamed roles ("the colleague") be included, and tells the planner to reference them by the names it assigned.
  - GIVEN a planner response THEN the cast normalizes: missing names dropped, unknown kinds defaulted to `character`, duplicates collapsed case-insensitively, appearance used when no description is given.
  - GIVEN existing project cast THEN only those missing are offered for casting, matched case- and space-insensitively; a member with zero reference images still counts as missing.
  - GIVEN the stored proposal THEN it keeps the cast beside the shots, and rows written before this (a bare shots array) still read.
  - GIVEN a portrait request THEN it is a plain reference portrait carrying the film's light and colour but NOT its typography, continuity or shot composition, and states that no text belongs in the frame.
  - GIVEN a finished portrait THEN the cast member is created from it and attached to the project — INV-AST-004 forces this order, since an entity needs 1–5 refs to exist.
  - GIVEN a generation that produced no image THEN casting is refused.
- **Tests:** `tests/casting.spec.ts` (14) · `tests/casting-portrait.int.spec.ts` (5) · `libs/gen/tests/prompt.spec.ts` REQ-GEN-030 (5) · `libs/shared/tests/style-card.spec.ts` portrait block (5)
- **Code:** `src/casting.ts` (`normalizePlannedCast`, `castingGaps`) · `src/service.ts` (`requestEntityPortrait`, `castFromPortrait`, proposal keeps cast) · `libs/gen/src/prompt.ts` (cast in the plan schema) · `libs/shared/src/contracts/style-card.ts` (`toPortraitStyle`) · `apps/web/app/actions.ts` (`castMemberAction`) · `apps/web/app/p/[id]/page.tsx` (CASTING panel)
- **Log:** see LOG 2026-07-27
- **Deferred / notes:** casting does not retro-fit shots already generated — regenerate those a newly cast character appears in. One portrait per member (INV-AST-004 allows up to 5); more angles would strengthen consistency further.

### REQ-STB-047 — Prompt drift audit + restore from plan
- **Status:** IN_REVIEW · **Stage:** P9 · **Priority:** should
- **Raised-by:** USER 2026-07-27, looking at shot 15 "Synchronized Drink": "this does not sound like the prompt that was used for this image / video?" It held shot 6's title-card text, character for character.
- **Statement:** Prompts silently written to the wrong shot shall be detectable and recoverable. REQ-STB-045 stopped NEW corruption (the stage reused one shot's uncontrolled prompt boxes for another, so Save could write the wrong text) but did nothing about damage already done — and a prompt belonging to another shot still reads like a perfectly good prompt, so inspection alone will not find it. The planner's original text survives in `shot_plan_proposal` after the shot row is overwritten, which makes both detection and repair possible.
- **Acceptance criteria:**
  - GIVEN a project THEN every shot's stored prompts are compared against the newest plan proposal that names it, and drift is reported with both texts.
  - GIVEN a stored prompt character-identical to ANOTHER shot's THEN it is called out as a mis-saved prompt rather than an edit — that duplication is the fingerprint of the bug.
  - GIVEN `--restore` THEN the planned text is written back through `updateShotScripts`; without it nothing is written, because drift is also what a deliberate edit looks like.
  - GIVEN a hand-added shot with no planned counterpart THEN it is skipped rather than reported.
- **Tests:** verified against the live project — 1 of 11 shots flagged and restored, re-audit clean.
- **Code:** `scripts/audit-prompts.ts` · `pnpm audit:prompts <projectId> [--restore]`
- **Log:** see LOG 2026-07-27
- **Deferred / notes:** an in-app "revert to planned" per shot would beat a CLI script, but it needs the proposal loaded per shot in the workspace; the script covers the damage that exists now. Only one shot was affected on the user's project — the blast radius was small, but it was real, and it had already produced paid media from a prompt that did not describe the shot.

### REQ-STB-046 — A shot's spoken line is editable without re-planning
- **Status:** IN_REVIEW · **Stage:** P9 · **Priority:** should
- **Raised-by:** USER 2026-07-27 — with REQ-GEN-028 fixed, the 11 shots they had already generated still stored no dialogue, and the only way to get lines was a re-plan that would discard paid takes.
- **Statement:** The words spoken in a shot shall be editable in place and saved with that shot's scripts.
- **Acceptance criteria:**
  - GIVEN a shot with no line THEN one can be stored; GIVEN an existing line THEN it is replaced.
  - GIVEN the rest of `direction` (synopsis, subject, action, mood) THEN it survives the edit — `direction` is one JSON column and this merges rather than replaces.
  - GIVEN an emptied field THEN the key is removed, making the shot silent again.
  - GIVEN an unknown shot THEN it is rejected.
  - GIVEN the workspace THEN a SPOKEN LINE field sits with the image and video scripts and saves with them.
- **Tests:** `tests/dialogue.int.spec.ts` (5)
- **Code:** `src/service.ts` (`updateShotDialogue`) · `apps/web/app/actions.ts` (`saveScriptsAndGenerateAction`) · `apps/web/app/p/[id]/page.tsx` (SPOKEN LINE field)
- **Log:** see LOG 2026-07-27
- **Deferred / notes:** one line per shot. A two-hander like `Synchronized Drink` cannot yet give each character their own line; the field takes whatever should be heard in that shot.

### REQ-STB-045 — Per-shot prompt identity + reference scrub at the prompt boundary
- **Status:** IN_REVIEW · **Stage:** P9 · **Priority:** must
- **Raised-by:** USER 2026-07-26: "for some reason the image prompt is not retained, so I could actually generate alternative images if I'm not happy? Now having two Pasi's drinking is not what I was after." Focused on shot 15, the IMAGE SCRIPT box showed shot 7's title-card text.
- **Statement:** Each shot's prompt editor shall show that shot's own text, and no reference name shall reach an image or video model through text the PLANNER wrote.
- **Acceptance criteria:**
  - GIVEN the stage swaps one panel in place THEN each panel carries `key={s.id}`, so switching shots remounts the uncontrolled `defaultValue` prompt boxes instead of reusing the previous shot's DOM.
  - GIVEN a plan-authored `customPrompt` naming the reference ("Cinematic 35mm film frame, Aki Kaurismäki visual style.") THEN the assembled frame prompt is scrubbed while the surrounding craft text survives.
  - GIVEN the same in a video prompt, or in a direction field the planner wrote, THEN likewise.
  - GIVEN a card that names no reference THEN prompts are untouched.
- **Tests:** `apps/web/tests/stage-panel-identity.spec.tsx` (3, source-level guard) · `libs/gen/tests/prompt.spec.ts` (4)
- **Code:** `apps/web/app/p/[id]/page.tsx` (`key={s.id}`) · `libs/gen/src/prompt.ts` (`guard()` on every visual prompt) · `libs/shared/src/contracts/reference-scrub.ts` (scrubber moved out of the compiler so prompt assembly can use it without a cycle)
- **Log:** see LOG 2026-07-26
- **Deferred / notes:** "two Pasis" is a separate cast problem, not a prompt problem — the plan's `Synchronized Drink` shot has Pasi AND a colleague, but only Pasi is cast with reference images, so the model drew him twice. Casting a distinct second entity (or naming the colleague's appearance in the shot's prompt) is the fix; recorded here rather than silently bundled.

### REQ-STB-044 — The film's look reaches every picture
- **Status:** IN_REVIEW · **Stage:** P9 · **Priority:** must
- **Raised-by:** USER 2026-07-26, on real output: "styling was not held in the images" (one shot returned as a flat cartoon while its neighbours were photographic) and "also character clothing changes" (grey suit → navy suit → olive shirt across five shots).
- **Statement:** Every image and video prompt shall carry the project's Style Card, and the card shall state what must remain identical between shots. `assembleFramePrompt`/`assembleTakePrompt` have accepted a `card` since REQ-GEN-026, but no caller passed one — so the look reached a picture only when the planner happened to write it into that shot's `imagePrompt`, which is exactly why one shot drifted to illustration.
- **Acceptance criteria:**
  - GIVEN a project with a card WHEN a frame is requested THEN the assembled prompt contains the card's camera notes and light.
  - GIVEN the same THEN the prompt states the continuity (wardrobe/props) that must not change between shots.
  - GIVEN the same THEN the prompt states the refusals — "no cartoon or illustrated rendering" has to be said to be obeyed.
  - GIVEN a compiled card THEN neither the frame nor the take prompt contains the reference name or the raw brief (SCN-DIR-002, now enforced at the real generation boundary rather than only in prompt-assembly unit tests).
  - GIVEN a take request THEN it carries the same look.
  - GIVEN an animation shot with no plan colours THEN accent/background fall back to the card palette (SR-DIR-007 at the renderer, not just the plan).
- **Tests:** `tests/card-prompts.int.spec.ts` (5)
- **Code:** `src/service.ts` (`projectCard`, wired into `requestFrame`/`requestTake`/`requestAnimationTake`) · `libs/shared/src/contracts/style-card.ts` (`continuity` axis; refusals in `toVisualStyle`) · `libs/shared/src/config/style-cards.ts` (continuity for all six seeds) · `libs/gen/src/style-compiler.ts` (compiles continuity)
- **Log:** see LOG 2026-07-26
- **Deferred / notes:** frames already generated keep their old prompts — this only affects new generations. Cast reference images remain the stronger consistency lever for faces; continuity is prose and so is advisory to the model, not enforced.

### REQ-STB-043 — Director's pass: plans graded against the active card before anything is billed
- **Status:** IN_REVIEW · **Stage:** P9 · **Priority:** should
- **Raised-by:** USER 2026-07-26: "Director's pass would be quite cool." — EPIC-STB-001, SR-DIR-006 (SCN-DIR-003).
- **Statement:** A draft shot plan shall state its own craft and be graded against the project's Style Card before any generation is paid for, with notes that name the shots and the axis each one violates; a revision prompt shall then ask for a plan that fixes exactly those notes.
- **Acceptance criteria:**
  - GIVEN a planner response THEN `shotSize`/`angle`/`movement` normalize from the top level or from `direction`, accept long-form spellings ("wide", "Push In"), fall back to MS/eye/static rather than dropping the shot, and DROP unknown vocabulary ("drone-orbit") rather than trusting it.
  - GIVEN a plan and an active card THEN notes name the violated axis — `forbidden-movement` for camera the style refuses, `duration-window` quoting the card's own window, `contrast-cut`, `coverage`.
  - GIVEN a plan that already honours the card THEN no notes.
  - GIVEN no card THEN only the universal principles apply — no `forbidden-movement`, because with no card there are no refusals.
  - GIVEN notes THEN the revision prompt carries them verbatim, carries the card's directing block, demands the same JSON shape back, and NEVER leaks the reference the card was compiled from.
  - GIVEN grading THEN it is pure and synchronous — no model call, so a plan can be reviewed before a frame or take is billed.
- **Tests:** `tests/director-pass.spec.ts` (13)
- **Code:** `src/director-pass.ts` (`reviewPlan`, `assembleDirectorPassPrompt`, `summarizeNotes`) · `src/plan-normalize.ts` (grammar fields) · `libs/gen/src/prompt.ts` (plan schema states the craft)
- **Log:** see LOG 2026-07-26
- **Deferred / notes:** the revision is not yet executed or applied — `assembleDirectorPassPrompt` is built and tested but nothing calls the model with it and writes the result back, and the notes are not yet surfaced in the UI. Both need the plan-proposal flow and are the remaining work on SCN-DIR-003, which therefore is NOT `UPPER_VALIDATED`.

### REQ-STB-042 — Style Card contract: archetypes become data, refusals become expressible
- **Status:** IN_REVIEW · **Stage:** P9 · **Priority:** should
- **Raised-by:** USER 2026-07-26: "also looking for even further styling options. Like saying I want a 1-minute feature film of ModernPath AI directed by Aki Kaurismäki, a bit humoristic." — EPIC-STB-001, SR-DIR-003.
- **Source:** `epics/EPIC-STB-001-director-briefs.md` (SCN-DIR-001, SCN-DIR-002); `docs/87-directing-playbook.md`
- **Statement:** Style shall be structured, editable data rather than prose in prompt strings. A Zod Style Card (ADR-003 canonical) carries typed craft axes — structure/arc, camera (allowed movements, sizes, angles), pacing window, palette, light, performance, **humour**, sound, typography — plus **anti-notes**, the refusals no `ArchetypeRecipe` field could express. The six existing archetypes are re-expressed as seed cards under their existing keys. `provenance` (the user's brief and any reference director) is display-only and MUST NOT reach any prompt.
- **Acceptance criteria:**
  - GIVEN a fully specified card THEN it parses; GIVEN no `antiNotes` key THEN it is rejected — a style with no refusals has no point of view.
  - GIVEN a non-hex palette colour, an inverted duration window, or an empty `allowedMovements` THEN the card is rejected.
  - GIVEN a card THEN `toGrammarConstraints` yields exactly the grader's `allowedMovements` + `durationWindowS` (REQ-STB-041).
  - GIVEN a card compiled from a brief naming a real director THEN NEITHER `toDirectingBlock` NOR `toVisualStyle` contains that name or the raw brief, while the craft primitives (camera notes, light, palette prose) do appear — SCN-DIR-002.
  - GIVEN a card THEN the directing block states the refusals as explicit AVOID instructions, carries the humour register, and forbids the planner from naming any real director/artist/brand in the prompts it writes.
  - GIVEN the seed set THEN its keys equal today's six archetype keys (no project loses its selection), every seed validates, every seed has ≥1 anti-note, none names a reference, and `cinematic-mood`/`hype-countdown` keep their docs/87 windows ([8,8] / [4,4]).
- **Tests:** `libs/shared/tests/style-card.spec.ts` (18)
- **Code:** `libs/shared/src/contracts/style-card.ts` (schema + `toGrammarConstraints`/`toDirectingBlock`/`toVisualStyle`) · `libs/shared/src/config/style-cards.ts` (six seed cards)
- **Log:** see LOG 2026-07-26
- **Deferred / notes:** enabler slice — `archetypes.ts` still feeds `recipeFor()` (`libs/stb/src/service.ts`) and `setProjectArchetype` (`libs/prj/src/service.ts`); switching those call sites to cards is TASK-DIR-004, which the key-parity test above protects. Storing per-project editable cards is SR-DIR-008. Whip pan was left out of the vocabulary deliberately: it is a transition, not a shot movement, and belongs to the deferred exporter-transitions work.

### REQ-STB-041 — Shot grammar: typed craft vocabulary + plan grader
- **Status:** IN_REVIEW · **Stage:** P9 · **Priority:** should
- **Raised-by:** USER 2026-07-26: "Can we further improve the artistic director skills of our video scripting… Like saying I want a 1-minute feature film of ModernPath AI directed by Aki Kaurismäki, a bit humoristic." — EPIC-STB-001, SR-DIR-001 + SR-DIR-002.
- **Source:** `docs/87-directing-playbook.md` §"Directing principles" (2, 4, 6); `epics/EPIC-STB-001-director-briefs.md`
- **Statement:** Craft direction shall be expressible as typed data and gradable as such. A versioned vocabulary (shot size, angle, movement, plus grader thresholds) lives in `@avd/shared/config`, and a pure `gradeShotGrammar(shots, constraints)` returns structured, director-readable notes — so the playbook's principles are checked rather than merely injected into a prompt string. `direction.camera` free text could not express or verify any of this.
- **Acceptance criteria:**
  - GIVEN a plan already following the principles THEN no notes are returned.
  - GIVEN two adjacent shots of the same size AND angle THEN a `contrast-cut` error names both (principle 4); GIVEN the angle differs THEN no note — the composition genuinely changed.
  - GIVEN a final shot far shorter than the longest THEN a `held-ending` warning (principle 6); GIVEN the final shot is a graphic end-card THEN none — an end-card IS the held ending.
  - GIVEN a style constraint `allowedMovements` THEN every shot outside it is a `forbidden-movement` error (the Style Card anti-notes axis).
  - GIVEN a style `durationWindowS` THEN shots outside it are a `duration-window` warning naming the window.
  - GIVEN an action line chaining more than two beats THEN a `one-idea` warning (principle 2); noun conjunctions ("a man and a woman sit") must not trip it.
  - GIVEN ≥3 shots all framed identically THEN a `coverage` warning.
  - GIVEN mixed severities THEN errors sort before warnings.
- **Tests:** `tests/grammar.spec.ts` (11)
- **Code:** `libs/shared/src/config/grammar.ts` (vocabulary + `grammarPolicy` thresholds) · `libs/stb/src/grammar.ts` (`gradeShotGrammar`)
- **Log:** see LOG 2026-07-26
- **Deferred / notes:** enabler slice — the grammar is not yet emitted by the planner or shown in the UI. Consuming it is TASK-DIR-004 (card-driven prompts) and TASK-DIR-005 (director's pass); the plan schema gains the typed fields with TASK-DIR-002. Grader is pure and synchronous by design so a draft plan can be graded before any generation is billed (SCN-DIR-003).

### REQ-STB-040 — Edit clip length: free crop vs regenerate
- **Status:** IN_REVIEW · **Stage:** P8 · **Priority:** must
- **Raised-by:** USER 2026-07-25: "Maybe also being able to edit the length of clips (+renegerate or crop the video/animation)"
- **Statement:** Each shot on the stage carries a length field with `Set length` (INV-STB-001 bounds enforced in the service) and states the consequence before you spend: shortening below the take's real footage shows `✂ export crops Ns of this take · free` (the exporter already normalizes every clip with ffmpeg `-t durationS`, so no regeneration is needed); lengthening past it shows `⚠ take is Ns short — regenerate to fill` plus a hatched overlay on the clip in the timeline, with the take estimate repriced for the new length.
- **Acceptance criteria:**
  - GIVEN a shot shorter than its take THEN `trimmedS` > 0 and the UI calls the crop free.
  - GIVEN a shot longer than its take THEN `shortfallS` > 0 and the UI directs to a regenerate.
  - GIVEN a shot with no take THEN neither claim is made.
  - GIVEN Set length THEN the duration persists and the timeline, take estimate and off-beat state all update.
- **Tests:** `libs/stb/tests/timeline.spec.ts` REQ-STB-040 block · browser: 5s → 6s persisted (`duration_s` 6.0), shortfall + reprice shown, restored to 5s
- **Code:** `apps/web/app/actions.ts` (updateShotDurationAction), stage length editor in `apps/web/app/p/[id]/page.tsx`, `trimmedS`/`shortfallS` in `libs/stb/src/timeline.ts`
- **Log:** LOG 2026-07-25
- **Deferred / notes:** no re-encode-on-save crop (the export's `-t` covers it); trimming a take's IN point (start offset) is not supported — only its length; drag-the-edge resizing on the timeline → with REQ-STB-038.
