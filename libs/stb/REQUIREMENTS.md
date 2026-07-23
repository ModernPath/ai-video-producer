# Requirements Ledger — STB (Story & Storyboard)

## Dashboard — STB (Story & Storyboard)
Totals: 0 DONE · 24 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 0 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-STB-001 | Shot duration within config bounds | P1 | IN_REVIEW | INV-STB-001 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-002 | Shots hold a strict total order | P1 | IN_REVIEW | INV-STB-002 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-003 | Single selection per slot / take | P1 | IN_REVIEW | INV-STB-003 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-004 | Take selectable only when asset ready | P1 | IN_REVIEW | INV-STB-004 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-005 | Take belongs to its shot, never moved | P2 | IN_REVIEW | INV-STB-005 | tests/take-binding.int.spec.ts | selectTake guard (// INV-STB-005), no move API |
| REQ-STB-006 | Frame re-selection keeps takes + provenance | P2 | IN_REVIEW | INV-STB-006 | tests/frame-reselect.int.spec.ts | takeProvenance, 'from older frame' badge (page.tsx) |
| REQ-STB-007 | Shot-plan apply replaces unpaid, protects takes | P2 | IN_REVIEW | INV-STB-007, BR-STB-005 | tests/replan-protect.int.spec.ts + browser E2E | applyShotPlan (replace arm), apply-button hint |
| REQ-STB-008 | Script versions via draft/revise | P2 | IN_REVIEW | `docs/13` §6, BR-STB-005 | tests/script.int.spec.ts | src/service.ts |
| REQ-STB-009 | Candidate removal (soft, unselected only) | P2 | IN_REVIEW | POL-STB-002/003, INV-AST-003 | tests/remove.int.spec.ts + browser | src/service.ts (removeFrameCandidate/removeTake) |
| REQ-STB-010 | Music brief: generate Suno prompt (attach/mix arms follow) | P3 | IN_REVIEW | BR-STB-007, `docs/17` §1 | tests/music.int.spec.ts + browser E2E | src/service.ts, apps/web (script page) |
| REQ-STB-024 | Plan-authored animation shots (free, no frame spend) | P6 | IN_REVIEW | USER Remotion epic ("purely remotion animations (prompt)") | plan-normalize spec + real E2E frame | migration 0020, normalize/apply, plan prompt, applyPlanAction branch, badge+prefill UI |
| REQ-STB-023 | Music brief includes timed lyrics unless instrumental | P5 | IN_REVIEW | USER 2026-07-23 (Lyria epic) | libs/gen/tests/prompt.spec.ts + real-model check | assembleMusicBriefPrompt lyrics rule |
| REQ-STB-022 | Reorder shots (animatic/export follow) | P2 | IN_REVIEW | SCN-STB-010, INV-STB-002 | tests/reorder.int.spec.ts + browser E2E | reorderShot (3-step swap), ↑↓ UI |
| REQ-STB-021 | A/B take comparison | P2 | IN_REVIEW | docs/features/shot-editor.md | browser E2E (overlay, selectors, play both) | components/ABCompare.tsx, takes-lane wiring |
| REQ-STB-020 | Retake with instruction | P2 | IN_REVIEW | SCN-STB-021, docs/features/shot-editor.md | tests/retake.int.spec.ts + browser (UI) | requestRetake, retake_of lineage in materialize, per-take UI |
| REQ-STB-018 | Normalize real-model shot plans (break-into-shots robust) | P0 | IN_REVIEW | USER BUG 2026-07-23 (raw markdown + plan silently dropped) | tests/plan-normalize.spec.ts | src/plan-normalize.ts, service.ts, gen/prompt.ts+provider.ts, script page (Markdown) |
| REQ-STB-019 | Remove a shot (cut) from the storyboard | P1 | IN_REVIEW | USER 2026-07-23 "how can I remove cuts?" | tests/remove-shot.int.spec.ts | src/service.ts (removeShot), removeShotAction, ✕ Remove cut button |
| REQ-STB-016 | Per-shot reference images on the image script | P1 | IN_REVIEW | USER spec revisit 2026-07-23 (2d) | tests/shot-refs-and-first-frames.int.spec.ts + browser E2E | migration 0013, service (updateShotRefs), ref-picker UI (page.tsx + updateShotRefsAction) |
| REQ-STB-017 | First frames auto-offered on plan apply | P1 | IN_REVIEW | USER spec revisit 2026-07-23 (3) | tests/shot-refs-and-first-frames.int.spec.ts | src/service.ts (applyShotPlan), apps/web (applyPlanAction + script page) |
| REQ-STB-015 | Generate from script + prose auto-prompts (no slop) | P1 | IN_REVIEW | USER FEEDBACK #2 2026-07-23 | tests (prompt prose + scripts) + browser (buttons live; user-driving) | prompt v2, saveScriptsAndGenerateAction |
| REQ-STB-014 | Shot plan authors per-shot scripts (ready image prompts) | P1 | IN_REVIEW | USER 2026-07-23 directives combined | tests/plan-scripts.int.spec.ts | fixtures+prompt+applyShotPlan (browser pending w/ 015) |
| REQ-STB-013 | Per-shot editable image & video scripts (visible refs) | P1 | IN_REVIEW | USER FEEDBACK 2026-07-23 | tests/shot-scripts.int.spec.ts + browser | src/service.ts, ../gen/src/prompt.ts, shot-card scripts UI |
| REQ-STB-012 | Video prompt drives script & image prompts with cast | P2 | IN_REVIEW | USER 2026-07-23, BR-STB-001 | tests/video-prompt.int.spec.ts + browser | src/service.ts, ../gen/src/prompt.ts, web UI |
| REQ-STB-011 | Shot plan proposal materializes and applies | P2 | IN_REVIEW | `docs/13` §6 ProposeShotPlan/ApplyShotPlan | tests/script.int.spec.ts | src/service.ts |

---

### REQ-STB-001 — Shot duration within config bounds
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-001
- **Statement:** Creating/updating a shot rejects durations outside `config.shot.minSeconds..maxSeconds`.
- **Acceptance criteria:**
  - GIVEN duration 6.5 WHEN CreateShot THEN shot persists with duration 6.5.
  - GIVEN duration 3 or 11 WHEN CreateShot/UpdateShot THEN rejected with `validation_failed` naming the bounds.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-002 — Shots hold a strict total order
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-002
- **Statement:** Each shot has a unique position within its project; new shots append at the end.
- **Acceptance criteria:**
  - GIVEN two created shots THEN positions are 1 and 2; listing returns them in order.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-003 — Single selection per slot / take
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-003
- **Statement:** A shot has at most one selected start frame, one selected end frame, one selected take; selecting replaces the previous selection.
- **Acceptance criteria:**
  - GIVEN take A selected WHEN SelectTake(B) THEN only B is selected.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-004 — Take selectable only when asset ready
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-004
- **Statement:** SelectTake requires the take's video asset status `ready`.
- **Acceptance criteria:**
  - GIVEN a take whose asset is `pending`/`failed` WHEN SelectTake THEN rejected `asset_not_ready`.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-008 — Script versions via draft/revise
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** `docs/13` §6 (DraftScript), BR-STB-005
- **Statement:** DraftScript produces a new immutable script version via GEN (kind `script`); versions increment; content persists with generation provenance.
- **Acceptance criteria:**
  - GIVEN a project with a brief WHEN DraftScript completes THEN script_version v1 exists with non-empty content and generation_id.
  - GIVEN an existing v1 WHEN DraftScript again THEN v2 exists; v1 unchanged.
- **Tests:** `tests/script.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 2)

### REQ-STB-024 — Plan-authored animation shots
- **Status:** IN_REVIEW · **Stage:** P6 · **Priority:** should · **Owner:** —
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
- **Status:** IN_REVIEW · **Stage:** P5 · **Priority:** must · **Owner:** —
- **Raised-by:** USER 2026-07-23: "Always generate also lyrics to the song unless it's instrumental" (Lyria epic, docs/85 §Music)
- **Source:** docs/85 §Music; Lyria 3 lyric tags [Verse]/[Chorus]/[Bridge]
- **Statement:** The music brief shall include full timed lyrics with section tags sized to the video duration unless the brief chooses instrumental (then it states "Instrumental — no lyrics"). One brief drives both Suno and Lyria.
- **Acceptance criteria:**
  - GIVEN the brief prompt THEN it demands lyrics with section tags unless instrumental.
  - GIVEN a vocal-leaning idea WHEN generated with the real model THEN the brief contains a LYRICS section with timed tags; instrumental ideas state instrumental explicitly.
- **Tests:** `libs/gen/tests/prompt.spec.ts` + real-model checks (vocal scratch: LYRICS [Intro](0:00–0:05)…; Aurora: "Instrumental only, no vocals") · **Code:** `libs/gen/src/prompt.ts` assembleMusicBriefPrompt · **Log:** LOG 2026-07-23 (slice 20)
- **Deferred / notes:** REQ-GEN-019 (Lyria generation, OQ-114 pricing) and REQ-GEN-020 (MM:SS transcription sync) are PROPOSED in the GEN ledger — next slices of the epic.

### REQ-STB-022 — Reorder shots
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** should · **Owner:** —
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
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** could · **Owner:** —
- **Raised-by:** last unbuilt shot-editor outcome (docs/features/shot-editor.md)
- **Source:** `docs/features/shot-editor.md` ("A/B compare two takes side by side")
- **Statement:** When a shot has ≥2 takes, an A/B overlay compares any two side by side with per-side selection and a synchronized "play both"; Escape/close dismisses.
- **Acceptance criteria:**
  - GIVEN <2 takes THEN no compare affordance; GIVEN ≥2 THEN "⇆ A/B compare" in the takes lane.
  - GIVEN the overlay THEN both videos render with A/B selectors; "play both" restarts both from 0.
- **Tests:** UI-only — browser E2E (scratch shot with 2 takes: overlay verified, then scratch removed) · **Code:** `apps/web/components/ABCompare.tsx`, takes-lane wiring · **Log:** LOG 2026-07-23 (slice 18)
- **Deferred / notes:** frame-accurate sync scrubbing not needed at 4–8s clip lengths.

### REQ-STB-020 — Retake with instruction
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** should · **Owner:** —
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
- **Status:** IN_REVIEW · **Stage:** MVP · **Priority:** must · **Owner:** —
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
- **Status:** IN_REVIEW · **Stage:** MVP · **Priority:** must · **Owner:** —
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
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
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
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
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
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
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
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
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
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Raised-by:** USER 2026-07-23 ("add the prompt for video, that then gemini-3.6-flash can generate a script and ready image prompts using potentially the assets")
- **Source:** BR-STB-001, `docs/13` §7, `docs/14` §5
- **Statement:** The project carries an editable **video prompt** (brief). Script and shot-plan generation consume it AND the attached cast (entities as CAST blocks), so `gemini-3.6-flash` writes the script and per-shot directions — the ready image prompts — around the user's assets. The UI exposes the prompt at project creation and on the script page.
- **Acceptance criteria:**
  - GIVEN a video prompt and attached cast WHEN DraftScript/ProposeShotPlan enqueue THEN the stored prompt snapshot contains the prompt text and a CAST block per entity.
  - GIVEN the script page WHEN the prompt is edited and saved THEN subsequent drafts use the new text (browser).
- **Tests:** `tests/video-prompt.int.spec.ts` + browser E2E · **Code:** `../gen/src/prompt.ts` (CAST blocks), `src/service.ts` (cast into script/plan/music), prompt UI (create + script page) · **Log:** LOG 2026-07-23 (slice 5)

### REQ-STB-011 — Shot plan proposal materializes and applies
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** `docs/13` §6 (ProposeShotPlan / ApplyShotPlan), INV-STB-001/002
- **Statement:** ProposeShotPlan (kind `shot_plan`) yields a stored proposal of shots (title, direction, duration within bounds); ApplyShotPlan creates those shots appended in order and marks the proposal applied. MVP: additive only; update/remove diff arms with paid-work protection follow in REQ-STB-007.
- **Acceptance criteria:**
  - GIVEN a script version WHEN ProposeShotPlan completes THEN a proposal exists with ≥3 shots, each duration within config bounds.
  - GIVEN a proposal WHEN ApplyShotPlan THEN shots exist in proposal order at the storyboard tail and the proposal is `applied`.
- **Tests:** `tests/script.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 2)

### REQ-STB-010 — Music brief: generate Suno prompt
- **Status:** IN_REVIEW · **Stage:** P3 · **Priority:** should
- **Source:** BR-STB-007, `docs/17` §1 (manual Suno round-trip)
- **Statement:** RequestMusicBrief generates Suno-ready prompt text from title/brief/target length (+ latest script when present) via GEN kind `music_brief`; the project keeps one current brief (regenerate replaces, provenance retained via generation id). Track attach + mix modes are separate arms (need REQ-AST-004 uploads) — deferred explicitly.
- **Acceptance criteria:**
  - GIVEN a project WHEN RequestMusicBrief completes THEN a music_brief row exists whose prompt mentions the target duration.
  - GIVEN an existing brief WHEN regenerating THEN the row is replaced (new generation id), not duplicated.
- **Tests:** `tests/music.int.spec.ts` + browser E2E · **Code:** `src/service.ts` (requestMusicBrief/getMusicBrief), migration 0006 · **Log:** LOG 2026-07-23 (slice 3)

### REQ-STB-009 — Candidate removal (soft, unselected only)
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** POL-STB-002/003 (user requirement #4 removal arm), INV-AST-003
- **Statement:** Users may soft-remove frame candidates and takes that are not currently selected; removed candidates vanish from strips and the animatic but their assets remain in storage (provenance sacred). Removing a selected candidate is rejected — unselect first.
- **Acceptance criteria:**
  - GIVEN an unselected frame candidate or take WHEN removed THEN it is soft-deleted (deletedAt), disappears from listCandidates, and its asset stays `ready`.
  - GIVEN a selected candidate WHEN removal attempted THEN rejected `conflict` and nothing changes.
- **Tests:** `tests/remove.int.spec.ts` + browser E2E · **Code:** `src/service.ts`, ✕ remove UI · **Log:** LOG 2026-07-23 (slice 4)

### REQ-STB-006 — Frame re-selection keeps takes + provenance
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** should · **Owner:** —
- **Raised-by:** seeded from `docs/13-storyboard.md`; promoted this slice
- **Source:** INV-STB-006
- **Statement:** Selecting a different start frame shall never destroy or regenerate existing takes; each take's conditioning frame remains queryable (takeProvenance) and the UI marks takes generated from a non-current frame.
- **Acceptance criteria:**
  - GIVEN a take generated from frame A WHEN frame B is selected THEN the take survives, its selection is untouched, and takeProvenance returns frame A's asset.
  - GIVEN the storyboard WHEN a take's conditioning frame ≠ the current selection THEN a "from older frame" badge shows.
- **Tests:** `tests/frame-reselect.int.spec.ts` · **Code:** `src/service.ts` (takeProvenance), `apps/web` takes strip badge · **Log:** LOG 2026-07-23 (slice 13)
- **Deferred / notes:** —

### REQ-STB-007 — Shot-plan apply replaces unpaid shots, protects takes
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must · **Owner:** —
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
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** should · **Owner:** —
- **Raised-by:** seeded from `docs/13-storyboard.md`; promoted this slice
- **Source:** INV-STB-005
- **Statement:** A take is permanently bound to the shot it was generated for: cross-shot addressing is rejected and the service surface exposes no operation that mutates a take's shot binding.
- **Acceptance criteria:**
  - GIVEN a take on shot A WHEN selected through shot B THEN rejected `not_found`; through shot A THEN selected.
  - GIVEN the STB service surface THEN no move/reassign/transfer operation exists.
- **Tests:** `tests/take-binding.int.spec.ts` · **Code:** `src/service.ts` selectTake (`// INV-STB-005`) · **Log:** LOG 2026-07-23
- **Deferred / notes:** —
