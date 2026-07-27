# Build Log — STB

## 2026-07-27 — human sign-off: 28 requirements IN_REVIEW → DONE
**Done:** USER:2026-07-27 "Let's approve all requirements in review state?" — the 28 IN_REVIEW rows in this ledger are approved and moved to DONE. Covers script, shot plan, casting, continuity chains, critique passes and the script studio. Status updated in all three places per `CLAUDE.md` §1.8 (dashboard row · detail block · `Totals:`); `PROGRESS.md` regenerated from the ledgers and independently agrees (129 DONE · 0 IN_REVIEW across all contexts).
**Decisions:** this drains the queue rather than collapsing the state — the option `docs/88-architecture-review.md` §6 offered when it recorded "48 IN_REVIEW · 0 signed off" and called the distinction information-free. IN_REVIEW keeps its meaning for future work; it is the sign-off that was outstanding, and the user is the sign-off authority. Checked before flipping: every row carries both a Tests and a Code link, and no detail block flags open work.
**Deferred:** none.
**Discovered:** with this drained, the whole repo holds 0 READY and 0 IN_PROGRESS — the actionable queue is empty. What remains is 4 PROPOSED (the architecture-review refactors) and 1 BLOCKED (REQ-STB-032 on OQ-115). Per `CLAUDE.md` §13 an empty queue is itself a review trigger.
**Follow-ups:** promote the PROPOSED refactors when the next build session starts.
**Gate:** ledger-only change, no code touched. Verified 0 residual IN_REVIEW in any ledger; row count matched detail-block count in every file before the flip (mismatch would have aborted).

## 2026-07-27 — docs reconcile: music has two routes, Lyria is the default (no code change)
**Done:** consolidating `AGENTS.md` into a routing map surfaced stale text — it described the pipeline as "assembly + music (Suno round-trip)" after REQ-GEN-019 moved generation in-house. The drift was wider than that one file: `docs/00` (×3), `docs/06`, `docs/13` (×2) and `docs/02` all named Suno as the ONLY route, while `docs/17` — the doc that owns the topic — had documented both correctly since 2026-07-23. All six now state both routes with Lyria 3 as the default; the Lyria section is numbered `docs/17` §4.
**Decisions:** USER:2026-07-27: "Lyria is the preference, but having prompts to suno is relevant still." Both routes are supported; Suno is NOT deprecated. The **brief is the shared artifact** — the same text either renders in-app or travels to Suno — which is why BR-STB-007 (freely editable) still governs both. `docs/17` §1 kept its number despite Lyria being the default, because four places cite `docs/17 §1` meaning Suno (`libs/asm/REQUIREMENTS.md`, `libs/stb/REQUIREMENTS.md` ×2, `src/service.ts:414`); renumbering would have broken them for cosmetic ordering.
**Deferred:** none.
**Discovered:** the summary docs drifted while the owning doc stayed true — the 2026-07-23 reconcile updated `docs/17` and missed every doc that SUMMARISES it. A capability that changes route needs a grep for the old route's name, not an edit to its own doc. Also GAP-106 (automate Suno) is unaffected and stays open.
**Follow-ups:** none.
**Gate:** docs only, no code touched. Verified `docs/17` §1–§3 numbering unchanged so all four inbound refs still resolve; no `.ts` file altered.

## 2026-07-27 — REQ-STB-062 a sub-clip never buys a start frame (→ IN_REVIEW)
**Done:** USER asked whether sub-scenes still generate images on approving the script. They did. Measured on their MP Burton project before answering: 5 of 10 shots are sub-clips and every one had bought a start frame the handoff discards — $0.34 of the $0.34 spent on that project was ~50% waste. `requestFrame` now refuses a sub-clip by name, and the two BATCH paths skip them.
**Decisions:** (1) The refusal goes in the SERVICE, not only the UI. REQ-STB-057 hid the controls and I stopped there; "Apply + frames" and "generate missing frames" are different paths and spent the money anyway. This is the rule I had already written for takes in REQ-STB-055 — "a disabled button is guidance, the service is the guarantee" — applied inconsistently one requirement later. (2) Single request REFUSES, batch SKIPS: a one-shot request is a mistake worth naming, while a bulk gesture must not abort because one shot is ineligible.
**Discovered:** this is the second instance of the same shape in two days — a rail enforced on one path and not another (the first was the prompt pipeline, ADR-010). Per `CLAUDE.md` §13, a repeated shape is a design signal: any control that guards SPEND should be audited across every path that can reach it, not fixed where it was noticed.
**Follow-ups:** none for this slice; the audit suggested above is worth a §13 sweep when REQ-STB-059/060 land.
**Gate:** 4/4 new tests red first (2 genuinely red); 361 passed / 5 skipped across stb+gen+web; tsc clean. Verified against the user's real project: both sampled sub-clips refused by name, the chain head still allowed, verification rows cleaned up afterwards.

## 2026-07-27 — architecture review (USER-requested)
**Done:** Reviewed the codebase against the code as it stands, not from memory (`docs/88-architecture-review.md`). Five refactors recorded as PROPOSED: REQ-GEN-032 (one prompt pipeline + golden-file tests), REQ-GEN-033 (lint/config hardening), REQ-STB-059 (split `service.ts` by aggregate), REQ-STB-060 (decompose `page.tsx`), REQ-STB-061 (render harness + the three UI escapes).
**Decisions:** the review's central finding — the suite was green while the product was wrong, for every single defect of this run — is recorded as a new Definition-of-Done clause in root `CLAUDE.md` §9.9, not only as prose in a document. A finding that lives only in a doc changes nothing.
**Discovered:** measured rather than assumed. `page.tsx` is 1,180 lines and 29% of all `apps/web` source; `stb/service.ts` is 1,136 lines with 42 exports; the suite is 59 integration specs to 25 unit specs with ONE web test; and the two visual prompt builders both return early on `customPrompt`, which the planner sets for every shot — so the composed branch holding the craft and safety rails is dead code in production. Four shipped defects trace to that one shape.
**Follow-ups:** REQ-GEN-032 first — contained, no product decisions needed, and it retires a whole class of bug.
**Gate:** documentation and ledger only; no code changed. `pnpm tsx scripts/progress.ts` refreshed: 78 DONE · 48 IN_REVIEW · 5 PROPOSED · 1 BLOCKED.

## 2026-07-27 — REQ-STB-058 a sub-clip admits a stale start frame (→ IN_REVIEW)
**Done:** USER: "there was already a generated image, so I can't actually go to real last frame of previous video." The panel said "starts from its last frame" while showing a frame generated BEFORE the chain existed — the automatic handoff had refused to overwrite it, which is the right default, but saying nothing about it made the UI lie and left no way out. A sub-clip now reports provenance honestly and offers "↻ use its last frame now".
**Decisions:** (1) Provenance is the frame candidate's `generationId`: a frame cut from a take carries that take's generation, so "did this come from the source" is answerable without a new column. Noted as an inference — it would need a real column if frames ever gained other origins. (2) `waiting` is distinct from `stale`: a source with no chosen take has nothing to hand over, and telling the user to refresh would be pointless. (3) The refusal to auto-overwrite stands — the fix is disclosure plus an explicit escape, not a silent clobber of a frame someone picked.
**Gate:** 6/6 `tests/handoff-state.spec.ts` (red first); tsc clean. Live on Kaurismäki 3: "Tracing Logic Errors" read "START FRAME · NOT from the previous take yet" with the warning and the button; after pressing it the frame's generation id matches the source take's exactly, the heading reverts to "handed over from the previous take" and the refresh disappears. Suite: the run showed 2 known MinIO/docker flakes (`ast/uploads`, `ast/derivatives`) — an earlier run showed 7 failures at load average 102, all of which pass in isolation; nothing here touches those paths.

## 2026-07-27 — REQ-STB-056 sub-clip numbering · REQ-STB-057 given start frames (→ IN_REVIEW)
**Done:** USER: "indicate at timeline which clips are linked, e.g. 4, 4.1, 4.2" and "if we have continuity, should we show only the last frame and hide other starting images? Maybe even skip the starting frame creation for subclips?" Both landed. Chains now read 6, 6.1, 7 in the rail, the timeline and the shot header; a sub-clip shows only its handed-over frame and cannot buy more.
**Decisions:** (1) Sub-clips do NOT consume top-level numbers — after 4.2 the next independent shot is 5, not 7, because the numbering describes the FILM's structure rather than the row count. (2) Sub-clips of a sub-clip stay flat under the head (4.1, 4.2, never 4.1.1): a chain is a sequence, not a tree. (3) Indentation in the rail was considered and dropped — the number already carries the relationship and indentation would fight the drag-to-reorder affordance. (4) The second ask was not cosmetic: offering a picker on a sub-clip invites the user to break the chain, and offering paid frame generation sells an image that gets discarded. Both are now absent, with the reason stated where the control was.
**Deferred:** REQ-STB-057 is UI-only and guarded by live verification rather than a unit test — the service already refuses out-of-order takes (REQ-STB-055), so a frame bought on a sub-clip is wasteful rather than dangerous. Breaking the chain restores the full picker, which is the intended escape hatch.
**Gate:** 7/7 `tests/chain-labels.spec.ts` (red first); 456 passed / 14 skipped, with `ast/derivatives` and `ast/uploads` flaking under machine load and passing in isolation. tsc clean. Live on the user's film: rail and timeline both read 6 → 6.1 → 7; Coffee Mug Lift shows "START FRAME · handed over from the previous take — not a choice" with no purchase, while Coffee Mug Lower still offers "＋ 2 frames ≈ $0.13".

## 2026-07-27 — REQ-STB-055 chains generate in order (→ IN_REVIEW)
**Done:** Finished the half of REQ-STB-054 the USER had named and I had left open — "continue as the video for first is generated". A chained shot generated before its source has no last frame to start from: the take is bought, the chain is silently defeated, and nothing says so. `requestTake` now refuses it by name, the shot shows its place in the chain (`2 of 3`), and the HEAD offers one action that generates the whole chain in order.
**Decisions:** (1) The refusal lives in `requestTake`, not only in the disabled button — a button is guidance, the service is where the money is spent and therefore where the guarantee belongs. (2) The blocker names the shot holding it up: "Continues Coffee Gesture — generate and choose that take first" is answerable; "blocked" is not. (3) `chainGenerationPlan` returns the ORDER and deliberately does not enqueue: each shot's start frame only exists once the previous take is CHOSEN, so enqueuing the chain up front would hand every follower an empty frame — precisely the failure this exists to prevent. (4) The chain action stops at the first failure rather than burning the rest of the chain on a broken start. (5) Cycle walks are capped: the validator refuses cycles, but existing data can still contain one and a page must not hang over a bad row.
**Deferred:** the chain action auto-selects each take to hand the frame on, so choosing between takes mid-chain means generating shot by shot instead. Frame generation is unordered — only takes carry continuity.
**Gate:** 15 new tests red-first (12 chain ordering, 3 service refusal); full suite 452 passed / 14 skipped, with `ast/uploads` flaking under machine load ~50 and passing in isolation. tsc clean. Live: Coffee Gesture reads "CONTINUITY · 1 of 2" and offers "▸ Generate the chain (2 shots)"; Coffee Mug Lift reads "2 of 2" and offers only to break it.

## 2026-07-27 — REQ-STB-054 continuity chains · REQ-AST-013 tail frame (→ IN_REVIEW)
**Done:** USER: "the clothing and positions of persons sitting are changing… store the last frame of video as reference starting image for next clip? They should be considered as sub-clips for the main clip." Casting held the faces (REQ-STB-048) and the plate held the room (REQ-STB-053), but neither can hold a POSE or the exact drape of a coat — only the previous frame can. A shot can now continue another: `continues_from_shot_id`, a tail frame extracted from the source take (`extractTailFrame`, docker ffmpeg `-sseof`), installed as the follower's start frame, and a CONTINUITY panel on the shot showing the dependency.
**Decisions:** (1) Automatic handoff (on take selection) never clobbers a start frame the user chose; an EXPLICIT "continue that shot" replaces it, because that is what the click means. Found by verifying live: the first link did nothing visible, since both shots already had frames and the idempotence guard skipped them. (2) The replaced frame is retired so a shot never offers two start frames. (3) Cycles are rejected by walking the chain — a loop would make the handoff never terminate. (4) A missing or unreadable tail degrades to "no start frame", never fails the take that produced it.
**Discovered:** `getObject` returns `{ bytes, mime }`, not raw bytes — I passed the whole object to ffmpeg, which wrote nothing and returned null, and the handoff silently did nothing. The integration test caught it; a unit test with a mocked store would not have. Also: `uploadBytesDirect` accepts image/audio only, so the fixture writes the video object and row the way the executor does.
**Deferred:** the chain conditions the START of the next take, and the video model still drifts WITHIN a clip, so a long chain accumulates drift. Generation order is not enforced — a continuing shot generated before its source simply has no frame yet and says so on the panel.
**Gate:** 11/11 `tests/continuity.int.spec.ts` + 3/3 `libs/ast/tests/tail-frame.int.spec.ts` (both red first); full suite 435 passed / 14 skipped, with the `ast/derivatives` docker-thumbnail spec flaking under machine load ~51 and passing in isolation. tsc clean; migration 0025 applied. Live on the user's film: linked Coffee Mug Lift to Coffee Gesture and confirmed its start frame now carries the SOURCE take's generation id, replacing the frame that was there.

## 2026-07-27 — REQ-STB-053 a scene is cast: locations get a reference plate (→ IN_REVIEW)
**Done:** USER across four takes of one canteen: "the cafe setting all the time changes. Maybe we should also generate a scene reference image for clips that belong at same scene?" Right, and it is the same fault as the characters one level up — REQ-STB-048/049 held faces still while the space behind them was re-invented every shot, because nothing held the space. A recurring PLACE is now cast like a body: kind `location`, a reference plate, attached to every shot set there.
**Decisions:** (1) Reused the ENTITY mechanism rather than inventing a scene model. A location is an entity with refs, so per-shot attachment, the casting panel, gap detection and prompt narrowing all worked unchanged — the only new code is the plate's own prompt. (2) A plate is the space EMPTY: no continuity (a room wears nobody's wardrobe), no performance direction (nobody is there to perform), explicit "no people" — anyone standing in the plate would be dragged into every shot conditioned on it. (3) `entityKinds` is now the single source; `casting.ts` had its own hardcoded copy of the kinds list, which drifted the moment `location` existed, and that is precisely what the no-literals rule is for.
**Deferred:** shots generated before a plate existed keep their old references — regenerate them. One plate per location; a scene shot from several angles may want more (INV-AST-004 allows 5). Scene boundaries are the plan's judgement, not a first-class concept in the data model — OQ-108 covers whether shots need explicit scenes.
**Gate:** 8 new tests red-first; full suite 424 passed / 14 skipped / 0 failed; tsc clean; migration 0024 applied. Live on the user's film: the planner cast Corridor, Office and Canteen as locations, the five canteen shots all name `Canteen`, and the generated plate is an empty canteen — crimson booths, dark teal walls, hanging tungsten pendants, nobody in it.

## 2026-07-27 — REQ-STB-052 critique the SCRIPT, not just the plan (→ IN_REVIEW)
**Done:** USER, on a project with a script and no shots: "shouldn't it be run for the script?" Correct, and it is the earlier place — runtime, structure and who is in the film are decided in the script, so REQ-STB-051 was catching those faults only after each had been split across ten shots. Four script lenses (editor/runtime, script editor/story, first AD/cast, director/voice) read the script in parallel and a redraft answers all of them, stored as a new script version.
**Decisions:** (1) The script lenses are NOT the shot-plan lenses: a script has no framings or durations to judge, so the briefs judge runtime against content, structure, casting and voice-against-style instead. (2) The redraft returns prose, not JSON — script versions are prose, and forcing a structured contract on a rewrite loses exactly the formatting the writer needs. (3) A new VERSION, never an overwrite. (4) The script's own text is not scrubbed of reference names: it is the user's own writing going to a TEXT model, and SCN-DIR-002 governs VISUAL prompts. I had written that assertion wrongly at first — the test failed because the user's project is literally titled "MP - Kaurismäki 2" — and fixed the test rather than adding a scrub that would mangle their title.
**Discovered:** my own `casting-portrait` test called the global `runNextGeneration`, which claims ANY queued row, so under the parallel suite it ran another file's work and left the portrait unrendered. Same flaw I had just fixed in production `castMemberAction`; the test now runs its generation by id.
**Deferred:** the redraft replaces the whole script rather than proposing a diff — OQ-109 covers that UX and applies here too.
**Gate:** 11/11 `tests/script-critique.spec.ts` (red first); full suite 408 passed / 14 skipped / 0 failed; tsc clean. Live on the user's second project: v1 (6820 chars) → v2 (7886 chars), and the reviewers materially changed it — the film now opens on a corridor rather than a logo card, the shots carry explicit per-shot second counts, and the cast gained a second named character (Aino) where the script had previously needed a colleague it never cast.

## 2026-07-27 — REQ-STB-049 per-shot cast · REQ-STB-050 time budget · REQ-STB-051 multi-angle critique (→ IN_REVIEW)
**Done:** Three faults the USER saw in real output. (1) "modernpath logo is put to almost every scene" — `resolveShotRefs` fell back to the WHOLE cast whenever a shot had no explicit refs, so every shot was conditioned on the company logo and every prompt named the brand. The plan now says who is in each shot, apply attaches only those references, and the text cast block narrows to them. (2) "video/audio is cut… time understanding is poor" — added `speechSeconds` and a `line-too-long` ERROR, plus an explicit TIME BUDGET in the plan prompt (words per second, seconds per physical action, split a beat rather than let a take end mid-sentence). (3) "critique steps from few angles" — four independent lenses (editor/pacing, continuity supervisor, first AD/casting, script editor/story) read the plan in parallel, their findings merge with the mechanical grade, and a revised proposal is stored.
**Decisions:** (1) Lenses run in PARALLEL and in ISOLATION — one shared conversation would let them converge on a single opinion, which is the opposite of why there are several. (2) The revision is a NEW proposal: the original stays on the record and nothing is applied behind the user's back. (3) `speechHeadroom` (25%) means a line filling every last frame is still flagged — a take ending on the final syllable reads as cut off even when nothing was cut. (4) A shot naming nobody resolves to null rather than the whole cast: a graphic card needs no references, and "no choice" must not mean "everything".
**Discovered:** scoping `sweepStuckGenerations` to a project — my page-load sweep and the existing global reaper test were reaping each other's fixtures. Project-scoped is also more correct: a page load has no business failing another project's running work.
**Deferred:** one critique pass, not a loop to convergence (press it again); speech rate is one global constant where a deadpan card should be slower than a hype one; physical-action duration is guidance to the planner, not measured.
**Gate:** 23 new tests red-first (7 cast-per-shot, 5 timing, 11 critique); 396 passed / 14 skipped, with one docker-ffmpeg thumbnail test (`ast/derivatives`) flaking under machine load ~61 and passing in isolation — untouched by this work. tsc clean. Live on the user's film: the re-planned shots list ModernPath in NO shot's cast, and "↻ Critique & improve" produced a materially better plan — it SPLIT the two-hander dialogue across two shots (one line each) and added "Colleague Waiting at Diner" to establish him before he appears.

## 2026-07-27 — REQ-STB-048 the plan casts the film (→ IN_REVIEW)
**Done:** USER: "the other characters than Pasi are not kept… director should think of cast and list them." Only cast entities carry reference images, and reference images are the entire mechanism of character consistency — so "the colleague", never cast, was re-invented every shot, and in `Synchronized Drink` the model simply drew Pasi twice. The shot plan now returns a `cast` list beside the shots; the workspace shows who has no reference image and casts them by generating a portrait from the planner's appearance line, or by upload.
**Decisions:** (1) A member with ZERO reference images counts as still needing casting — an entity with no refs contributes nothing, so treating it as cast would be a lie. (2) INV-AST-004 (1–5 refs) forces portrait-before-entity, which is also the only order that means anything. (3) The portrait carries the film's light and colour but NOT its typography, continuity or shot composition — see below. (4) The proposal now stores `{shots, cast}` instead of a bare array; readers already accepted both shapes, so existing rows still parse, and I moved two older tests off the raw column onto `normalizePlannedShots` rather than freezing the storage shape into assertions.
**Discovered (three, all from running it for real):** (a) `drainQueueAndMaterialize` calls `runNextGeneration`, which claims ANY queued row — with a shot plan already waiting it ran that instead of the portrait, and casting then read a generation that had not run. Casting now runs its own generation by id. (b) The first portrait came back with **"THE WORKER" burned across it** in the card's yellow display type, wearing the MAIN character's navy work jacket — the full visual style applied to a reference image. A reference conditions every later image of that character, so anything wrong in it is wrong everywhere; added `toPortraitStyle` which keeps light, colour and performance and drops typography, continuity and composition, plus an explicit no-text instruction. The regenerated portrait is clean, his own clothes, clearly not Pasi. (c) A shot-plan generation failed as `output_unusable` with "non-JSON structured output" — the response was TRUNCATED, not malformed, because carrying a cast made it longer. The message now says so, since "non-JSON" sends you hunting for a prompt bug that is not there.
**Deferred:** casting does not retro-fit shots already generated. One portrait per member; more angles would strengthen consistency.
**Gate:** 24 new tests red-first across casting, portraits and the plan prompt; 321 passed / 5 skipped across shared+stb+gen+prj+web; tsc clean. Live: re-planned the user's film — the planner cast Pasi, Colleague and ModernPath; the workspace showed "1 character has no reference image"; generating gave a distinct middle-aged man in the film's teal-and-primaries world with no text and his own clothes; `Colleague` is now on the project with 1 ref.

## 2026-07-27 — REQ-STB-047 prompt drift audit + restore (→ IN_REVIEW)
**Done:** USER noticed shot 15 "Synchronized Drink" showing a title-card prompt. It was not a stale render — the DATABASE held shot 6's text, character for character, written there by the stale-textarea bug that REQ-STB-045 fixed. Keying the panels stopped new corruption but left the existing damage in place, and a mis-saved prompt reads like a perfectly good prompt, so nobody would find it by looking. Wrote `pnpm audit:prompts` to compare every shot against the plan that produced it, and restored the one affected shot.
**Decisions:** (1) `--restore` is opt-in and every change is printed first, because drift is also what a deliberate edit looks like and the tool must not overwrite someone's own work. (2) A stored prompt character-identical to another shot's is reported as a mis-save specifically — that duplication is the fingerprint, and it separates the bug from an edit. (3) Recovery reads `shot_plan_proposal`, which keeps the planner's original text long after the shot row is overwritten.
**Discovered:** the blast radius was 1 of 11 shots — smaller than feared, but real, and that shot had already produced paid frames and a take from a prompt describing a different scene entirely.
**Deferred:** an in-app "revert to planned" per shot would beat a CLI script; it needs the proposal loaded per shot in the workspace.
**Gate:** audit found exactly 1 drifted shot on the user's project, flagged it as identical to shot 6, restored it through `updateShotScripts`, and a re-audit reports `11 shots · 0 differ`. Confirmed in the browser that Synchronized Drink now shows its own diner-booth prompt.

## 2026-07-27 — REQ-STB-046 a shot's spoken line is editable (→ IN_REVIEW)
**Done:** REQ-GEN-028 fixed the pipeline so dialogue reaches the video model, but the user's 11 existing shots still stored none, and the only route to lines was a re-plan that would have discarded takes they had already paid for. Added `updateShotDialogue` and a SPOKEN LINE field beside the image and video scripts, saved by the same Save.
**Decisions:** `direction` is a single JSON column, so the setter MERGES — an edit to the line must not wipe the planner's synopsis, subject, action and mood. Emptying the field deletes the key rather than storing "", so a shot becomes genuinely silent instead of carrying an empty quote into the prompt.
**Deferred:** one line per shot. A two-hander like `Synchronized Drink` cannot give each character their own line yet.
**Gate:** 5/5 `tests/dialogue.int.spec.ts` (red first — `updateShotDialogue is not a function`); tsc clean. Live: typed the line on Pasi Close-Up in the browser, confirmed it persisted to `direction.dialogue`, and re-assembled that shot's real take prompt to see it carried.

## 2026-07-26 — REQ-STB-045 per-shot prompt identity · reference scrub at the boundary (→ IN_REVIEW)
**Done:** USER: "the image prompt is not retained." The stage swaps ONE panel in place (`stagePanels[focus]`) and every panel has the same element shape, so React reused the DOM; `defaultValue` is uncontrolled and only applies on mount, leaving the previous shot's text in the box. Saving would have written it to the wrong shot and bought a frame from it. Fixed with `key={s.id}` on the panel root. Verified in the browser across a 0→1→2→1→0 shot walk: every box now shows its own text.
**Decisions:** the guard test is source-level, and says so in its own comment — the panel is built inside an async server component that reads the database, so there is nothing to render in a unit test. I first wrote a test that built its own fixture and asserted on that; it passed while the bug was live, which makes it worse than no test, so I replaced it with one that reads `page.tsx` and fails if the key is removed.
**Discovered (the bigger one):** browsing shots surfaced a stored prompt reading "Cinematic 35mm film frame, Aki Kaurismäki visual style." The PLANNER wrote the reference into the shot's own imagePrompt despite the directing block forbidding it, and a `customPrompt` goes to the image model verbatim — so the epic's governing constraint was defeated by a path none of the earlier guards covered: they all checked text the CARD produced, never text the planner produced. Every assembled visual prompt is now scrubbed of the card's references at the last boundary before a model sees it. Instructions to a model are not a guarantee. On the user's real project, 7 of 11 stored image prompts name a reference and 0 survive assembly.
**Also discovered:** their compiled card had been silently destroyed. The picker renders `defaultValue={p.archetype ?? ""}` — "freeform" — even while a compiled card is active, so pressing Set on what looked like the current state wiped it, because my own "exactly one style source" rule nulled the card on any archetype write. Now only choosing a real archetype replaces a card, and the picker names the compiled card instead of lying about freeform.
**Deferred:** "two Pasis" is a CAST problem, not a prompt problem — the shot has Pasi and a colleague, but only Pasi is cast with reference images, so the model drew him twice. Recorded on the requirement rather than bundled in silently.
**Gate:** 3/3 stage-panel guard + 4/4 new prompt-scrub tests (all red first); 188 passed / 5 skipped across the affected suites; tsc clean. Live re-check on the user's project after recompiling: card references `Aki Kaurismäki · Timo Salminen · Edward Hopper · Robert Bresson · Yasujiro Ozu`, 7 stored prompts naming one of them, 0 leaks after assembly.

## 2026-07-26 — REQ-STB-044 the film's look reaches every picture (→ IN_REVIEW)
**Done:** USER looked at real output: "styling was not held in the images… also character clothing changes". Root cause found immediately — `assembleFramePrompt`/`assembleTakePrompt` have accepted a `card` since REQ-GEN-026 and NOTHING EVER PASSED ONE. The look reached a picture only when the planner happened to write it into that shot's imagePrompt, which is why shot 2 came back as a flat cartoon between photographic neighbours. Added `projectCard()` in STB (compiled card > archetype seed) and wired it into `requestFrame`, `requestTake` and `requestAnimationTake`. Added a `continuity` axis to the Style Card for what must stay identical shot to shot, and put the refusals into `toVisualStyle` — "no cartoon or illustrated rendering" has to be *said* to be obeyed.
**Decisions:** (1) The refusals belong in the picture prompt, not only in the planner's brief: the planner writes one imagePrompt per shot, but the image model is what actually decides to render an illustration. (2) Continuity is a card axis rather than a per-shot field, because it is a property of the FILM ("Pasi wears the same grey wool suit throughout"), and the plan bias now tells the planner to repeat it verbatim in every shot's prompts. (3) Animation palette falls back user > plan > card, so a graphic with no plan colour stops using the renderer's warm default next to a slate-teal film.
**Deferred:** already-generated frames keep their old prompts — this changes new generations only. Cast reference images remain the stronger lever for faces; continuity is prose, so advisory to the model rather than enforced.
**Discovered:** the `continuity` axis broke tsc on all six seed cards, which is the schema doing its job — each got a real continuity note rather than a placeholder. Also, `toVisualStyle` had to tolerate cards that never went through the schema (plain literals in tests) where optional-with-default axes are simply absent.
**Follow-ups:** none for this slice.
**Gate:** 5/5 `tests/card-prompts.int.spec.ts` (red first, against a real enqueued generation's prompt snapshot); 155/155 across the affected specs; tsc clean. Live: recompiling the user's project produced a continuity line — "navy blue work jacket over a buttoned mustard-yellow shirt, slicked dark hair, worn tan leather folder" — which now reaches every frame prompt.

## 2026-07-26 — REQ-STB-043 fix: plan normalization was not idempotent
**Done:** `normalizePlannedShots` read `shotSize`/`angle`/`movement` from the top level or from `direction`, but NOT from the `grammar` object it writes itself. A shot-plan proposal is stored normalized, so every later reader normalizes a second time and silently lost the craft, falling back to MS/eye/static.
**Decisions:** read the third location too rather than changing what is stored — the stored shape is the contract other code already relies on, and tolerating all three input shapes is what this normalizer exists to do.
**Discovered:** found only by running the director's pass against a REAL stored plan, not a fixture. The user's Kaurismäki plan is WS/MS/MCU/MW/CU/WS, but the pass graded it as six identical MS shots and reported **five false contrast-cut errors** plus a false coverage warning. A grader that cries wolf is worse than no grader — this would have trained the user to ignore it. After the fix the same plan grades "The plan honours the style."
**Follow-ups:** none.
**Gate:** idempotence test added red-first (`expected MS to deeply equal MCU`); 25/25 across `director-pass.spec.ts` + `plan-normalize.spec.ts`, 140/140 across the epic's specs; tsc clean; re-graded the live plan clean.


## 2026-07-26 — REQ-STB-043 director's pass (TASK-DIR-005 → IN_REVIEW)
**Done:** Plans can now state their own craft and be graded against the project's Style Card. `plan-normalize` gained `grammar {shotSize, angle, movement}`, the planner's JSON schema asks for them, and `reviewPlan()` grades a normalized plan against the card's constraints — closing the loop opened by REQ-STB-041, which had a grader with nothing real to read.
**Decisions:** (1) Grading stays pure and synchronous, so a plan is reviewed for free before a frame or take is billed (SCN-DIR-003). Only the revision costs a text call. (2) Unknown vocabulary is DROPPED to the default rather than trusted — a model inventing "drone-orbit" must not silently widen the grammar — but long-form spellings ("wide", "Push In", "locked off") are accepted, because that is how models naturally write. (3) With no card selected, only the universal principles apply: no card means no refusals, so `forbidden-movement` cannot fire. (4) The revision prompt is built from `toDirectingBlock`, which is provenance-free, so the reference cannot reach the prompt that authors the visual prompts.
**Deferred:** the revision is not executed or applied, and notes are not surfaced in the UI — `assembleDirectorPassPrompt` is built and tested but nothing calls the model with it and writes the result back. SCN-DIR-003 is therefore NOT upper-validated, and the epic is not DONE.
**Discovered:** the plan bias from REQ-GEN-026 does most of the work — on the live run the model produced a plan the grader passed on the FIRST try. The pass is a safety net, not the primary mechanism; that is the right order, but it means the pass earns its keep on hand-edited and legacy plans more than on freshly generated ones.
**Follow-ups:** execute + apply the revision; surface notes in the workspace; persist compiled cards (SR-DIR-008) so a compiled brief is selectable at all.
**Gate:** 13/13 `tests/director-pass.spec.ts` (red first); full suite 287 passed / 14 skipped / 0 failed; `npx tsc -p apps/web/tsconfig.json --noEmit` clean. Live end-to-end (brief → compiled card → real shot plan → grade, no image/video billed): the card compiled to static+pan, 5–9s, and the plan came back 8 shots — WS/MCU/MS/CU/WS/MW/MCU/WS, every duration in window, ending on a held 8s wide — graded "The plan honours the style", with no reference name anywhere in the plan prompt.

## 2026-07-26 — REQ-STB-042 Style Card contract (TASK-DIR-002 → IN_REVIEW)
**Done:** The six archetypes stop being a hardcoded `Record` of English paragraphs and become validated data. Zod Style Card in `@avd/shared/contracts` (cross-context: STB plans with it, GEN prompts from it, PRJ will store it — and `shared` is the only package all three may import) with typed craft axes plus the two the prose recipes had no room for: **humour** (a register and a timing, which no archetype could express at all) and **antiNotes** (what the style refuses). All six re-expressed as seed cards under their existing keys.
**Decisions:** (1) `antiNotes` is REQUIRED, not optional — a style with no refusals has no point of view, and the refusals are half of what makes a look distinctive. (2) `provenance` (brief + reference names) is display-only and excluded from BOTH prompt builders, not just the visual one: the shot planner authors `imagePrompt`/`videoPrompt` itself, so a name in the text block would reach the image model by the back door. The directing block additionally instructs the planner never to name a real director/artist/studio/brand in prompts it writes. (3) One palette on the card feeds image prompts AND animation render props, which is the fix for graphics whose invented per-shot hex never matched the footage (SR-DIR-007). (4) Whip pan stays OUT of the movement vocabulary — it is a transition, not a shot movement; it belongs to the deferred exporter-transitions work. Caught myself faking it into the hype-countdown seed with a cast and removed it rather than corrupt the vocabulary.
**Deferred:** call-site migration — `archetypes.ts` still feeds `recipeFor()` and `setProjectArchetype`. Deliberate: this slice is the contract, TASK-DIR-004 switches the pipeline over, and the seed-key-parity test guards the switch so no existing project loses its archetype selection.
**Discovered:** nothing blocking.
**Follow-ups:** TASK-DIR-003 brief→card compiler (grounded research) → TASK-DIR-004 card-driven prompts → TASK-DIR-005 director's pass.
**Gate:** 18/18 in `libs/shared/tests/style-card.spec.ts` (red first — module absent); full suite 238 passed / 14 skipped / 0 failed; `npx tsc -p apps/web/tsconfig.json --noEmit` clean. Compiled the Kaurismäki brief by hand through the card: the directing block carries arc, 7–9 shots, static-only camera, 6–8s holds, hard practical light, saturated primaries on drab olive, deadpan performance, the humour register and five explicit AVOIDs — and neither block contains the reference name or the raw brief.

## 2026-07-26 — EPIC-STB-001 opened · REQ-STB-041 shot grammar + grader (→ IN_REVIEW)
**Done:** USER asked to "improve the artistic director skills" and for open-ended styling — "a 1-minute feature film of ModernPath AI directed by Aki Kaurismäki, a bit humoristic". Diagnosis: the system holds taste as PROSE (docs/87 principles injected into prompt strings) but not as STRUCTURE — `direction.camera` is free text, so "alternate wide/close" and "end on a held frame" were unverifiable, and nothing reviewed a plan before it was paid for. Opened `epics/EPIC-STB-001-director-briefs.md` (the repo's first epic: 3 URs, 4 BDD scenarios, 8 SRs, 5 tasks, rolled into WORKLIST) and built its first task: a typed shot-grammar vocabulary in `@avd/shared/config/grammar.ts` (7 shot sizes ordered wide→tight, 5 angles, 8 movements, `grammarPolicy` thresholds) and a pure `gradeShotGrammar()` in STB returning director-readable notes.
**Decisions:** (1) **A reference director's name is compiled into craft primitives and never forwarded to the image/video model** — recorded as the epic's governing constraint. Providers filter or dilute named-artist prompts, and a name averages to mush in an image model, whereas "frontal, locked-off, saturated red against olive, no reaction shots" repeats reliably across every shot. Grounded research (`libs/gen/src/research.ts`, REQ-GEN-024) already gives the compiler its source material. (2) The grader is pure and synchronous — no model call — so a draft plan can be graded for free before anything is billed (SCN-DIR-003's "not billed" clause). (3) A repeated shot size is forgiven when the angle changes, since the composition genuinely differs. (4) A graphic end-card is exempt from the held-ending rule — an end-card IS the held ending. (5) Thresholds live in `grammarPolicy`, not in the grader, per CLAUDE.md §1.4.
**Deferred:** the explainer-video family is a SIBLING epic, not a style card — explainers are voice-led, not music-led, and depend on GAP-108 (voice-over pipeline, post-MVP); recorded in WORKLIST Blocked/Deferred with the TTS-provider decision named. Motion themes (theme × animation template) wait on SR-DIR-007 card typography/palette. Export transitions + pacing curve stay in the backlog.
**Discovered:** the "one idea per shot" heuristic first under-counted — splitting only on "and then" scored the test action at 2 beats. Plain "and" is how a planner actually chains beats, so it must count; guarded against noun conjunctions ("a man and a woman sit") by requiring a fragment to carry ≥2 words before it counts as its own beat.
**Follow-ups:** TASK-DIR-002 Style Card contract (the 6 archetypes become seed data, not code) → TASK-DIR-003 brief→card compiler → TASK-DIR-004 card-driven prompts + name-exclusion test → TASK-DIR-005 director's pass.
**Gate:** 11/11 in `tests/grammar.spec.ts` (red first — module absent, then 10/11 with the one-idea gap); full suite 220 passed / 14 skipped / 0 failed. Demo against a conventional B2B plan under Kaurismäki constraints (static-only, 6–8s) returned 3 contrast-cut errors, a forbidden-movement error naming all four camera moves, plus held-ending, duration-window and coverage warnings — errors sorted first.

## 2026-07-26 — REQ-STB-038 follow-up: React shorthand/per-side border warning
**Done:** The timeline clip mixed `border: 1px solid …` with `borderLeft`/`borderRight`, and the drop edges change on every `dragover` — exactly the case React warns about ("Updating a style property during rerender (border) when a conflicting property is set (borderLeft)"). Split into `borderStyle` + four explicit widths and colours.
**Decisions:** Colour is per side too, not a single `borderColor`: a uniform value would have painted the 3px drop indicator in `--line` on every clip that isn't the focused one, making the landing gap invisible exactly when it matters.
**Deferred:** none.
**Discovered:** nothing else in `apps/web` mixes the `border` shorthand with a per-side property (scanned every `style={{…}}` object).
**Follow-ups:** none.
**Gate:** `npx tsc -p apps/web/tsconfig.json --noEmit` exits 0; live re-check — unfocused clip rests at 1px `rgb(42,48,60)` and shows a 3px accent left edge on dragover, back to 1px on dragend; no console warnings after a fresh load plus a drag.

## 2026-07-25 — REQ-STB-038 reorder shots by drag or ▲▼ (PROPOSED → IN_REVIEW)
**Done:** USER: "how can I actually change the order of the clips? I cant see up/down arrows?" — they existed, but only in the stage header, which sits above a tall player and scrolls out of view, so from the rail (where the order is actually *shown*) the cut looked frozen. Now every rail row has a `⋮⋮` grip plus an always-visible ▲/▼ pair (disabled at the ends), and timeline clips drag along the axis; an accent drop line marks the landing gap and the dragged element dims to 0.4. All paths go through one new positional move, `moveShotToIndex`, instead of N neighbour swaps.
**Decisions:** Positional move, not a swap — a drag from clip 7 to the front is one command and one revalidate. The drop index counts the list WITHOUT the moving shot, so the UI converts its visual gap index (`dropIdx > from ? dropIdx - 1 : dropIdx`); out-of-range clamps rather than throws. The renumber reuses **only the slots the live shots already occupy** rather than 1..n: `unique(project_id, position)` spans soft-deleted rows, which keep their slot, so a naive renumber collided (`Key (project_id, position)=(…, 2) already exists`) on any project where a shot had been cut — caught by a purpose-written RED test before it reached the UI. Two positions passes inside one transaction (negatives first) so no intermediate state trips the index. Client calls the action bound with `projectId` (Next `.bind`) rather than synthesizing a form per drag. The stage-header ↑↓ pair was removed as a duplicate; `reorderShotAction` stays exported for older callers.
**Deferred:** inserting a new shot at a position (append-then-move today); alt+↑/↓ keyboard shortcut; drag-the-edge resize.
**Discovered:** `take-binding.int.spec.ts` guards "no take-move on the service surface" with `/^move|reassign|transfer/i` over the export names — a shot reorder tripped it. Narrowed to `/^(move|reassign|transfer).*take/i` so the guard still forbids relocating a take between shots (INV-STB-005, cross-shot `selectTake` still rejected) without banning the word "move".
**Follow-ups:** none.
**Gate:** 10/10 in `tests/move-shot.int.spec.ts`; full suite 209 passed / 14 skipped / 0 failed; `npx tsc -p apps/web/tsconfig.json --noEmit` clean. Live check on Neon Rivers (7 live shots at positions 7–13, i.e. the soft-deleted case): ▼ on shot 7 → DB `7 ModernPath, 8 QStock…` slots preserved; timeline drag of `Brand Graphic End-Card` to the head → persisted `7 Brand Graphic End-Card…`; rail drag back to the tail → original order; drop line measured `rgb(226,163,60)` with source opacity 0.4, both cleared on dragend.

## 2026-07-25 — REQ-STB-039 music timeline · REQ-STB-040 clip length (→ IN_REVIEW)
**Done:** Timeline strip under the command bar: clips drawn to scale on the track's time axis (status-tinted, click to focus), section-change ticks + thinned MM:SS ruler, `cut` vs `track`, drift (`▲ past the track` / `◂ track unused`) and an off-beat count. Per shot: its `0:08 → 0:12 in the cut`, `♪ on/off the beat`, a length field with `Set length`, and the consequence stated — `✂ export crops Ns · free` (the exporter already normalizes with ffmpeg `-t`) vs `⚠ take is Ns short — regenerate to fill` (hatched overlay on the clip, take repriced).
**Decisions:** The axis follows the CUT, not the track — leftover is to scale only to a third of the cut, then a `⋯ +M:SS track` chip (a 2:55 track vs 0:27 cut had squeezed all clips into 15% of the width). No new crop pipeline: shortening is already free because the export trims each clip to the shot duration.
**Deferred:** waveform + scrubbing playhead; drag-the-edge trimming (with REQ-STB-038); take IN-point offset (length only).
**Discovered:** `asset.duration_s` was NULL for every audio row, so drift could never render — added `libs/ast/src/probe.ts` (ffprobe in the exporter's image), recorded on upload + music generation, and backfilled 17/17 existing tracks. Also: a scripted patch hit a duplicate anchor in uploads.ts and landed in `completeUpload` — tsc caught it (see [[tsc-after-scripted-edits]]).
**Follow-ups:** none.
**Gate:** RED→GREEN (timeline.spec 9 tests); full suite 193 passed | 14 skipped; tsc clean; browser: Neon Rivers boundary ticks + off-beat 3/5, length edit 5s→6s persisted and flipped it to 5/5 with the shortfall warning, restored to 5s.

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
