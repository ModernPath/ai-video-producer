# Requirements Ledger — STB (Story & Storyboard)

## Dashboard — STB (Story & Storyboard)
Totals: 0 DONE · 14 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 3 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-STB-001 | Shot duration within config bounds | P1 | IN_REVIEW | INV-STB-001 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-002 | Shots hold a strict total order | P1 | IN_REVIEW | INV-STB-002 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-003 | Single selection per slot / take | P1 | IN_REVIEW | INV-STB-003 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-004 | Take selectable only when asset ready | P1 | IN_REVIEW | INV-STB-004 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-005 | Take belongs to its shot, never moved | P2 | PROPOSED | INV-STB-005 | — | — |
| REQ-STB-006 | Frame re-selection keeps takes + provenance | P2 | PROPOSED | INV-STB-006 | — | — |
| REQ-STB-007 | Shot-plan apply protects paid shots | P2 | PROPOSED | INV-STB-007, BR-STB-005 | — | — |
| REQ-STB-008 | Script versions via draft/revise | P2 | IN_REVIEW | `docs/13` §6, BR-STB-005 | tests/script.int.spec.ts | src/service.ts |
| REQ-STB-009 | Candidate removal (soft, unselected only) | P2 | IN_REVIEW | POL-STB-002/003, INV-AST-003 | tests/remove.int.spec.ts + browser | src/service.ts (removeFrameCandidate/removeTake) |
| REQ-STB-010 | Music brief: generate Suno prompt (attach/mix arms follow) | P3 | IN_REVIEW | BR-STB-007, `docs/17` §1 | tests/music.int.spec.ts + browser E2E | src/service.ts, apps/web (script page) |
| REQ-STB-016 | Per-shot reference images on the image script | P1 | IN_REVIEW | USER spec revisit 2026-07-23 (2d) | tests/shot-refs-and-first-frames.int.spec.ts | migration 0013, src/schema.ts, src/service.ts (updateShotRefs) |
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

*(PROPOSED blocks 005–007: statements live in `docs/13-storyboard.md`; elaborate when promoted.)*
