# Build Log — ASM (Assembly & Export)

## 2026-07-28 — REQ-PLT-003: ffmpeg call sites moved to the shared runner (ADR-014)
**Done:** All five export-pipeline call sites (normalize, concat, music mix, dialogue extract, caption burn) switched from `docker run jrottenberg/ffmpeg` to `@avd/shared/ffmpeg`. Arguments are unchanged — they still reference files as `/work/<name>`; the runner bind-mounts on a laptop and rewrites `/work` to the real path against the baked-in binary in the deployed image (`FFMPEG_MODE=native`).
**Decisions:** the mode is configuration, not a branch at the call site (CLAUDE.md §1.10). No call site knows which mode it is in.
**Deferred:** —
**Discovered:** this code could never have worked in the container — there is no docker socket — and it would have failed SILENTLY, because a failed export only marks the job failed — nobody would have seen why.
**Follow-ups:** covered by REQ-PLT-003 in `libs/plt/REQUIREMENTS.md`.
**Gate:** `pnpm typecheck` clean; 375 unit tests green; golden argv spec `libs/shared/tests/ffmpeg.spec.ts`.


## 2026-07-27 — human sign-off: 4 requirements IN_REVIEW → DONE
**Done:** USER:2026-07-27 "Let's approve all requirements in review state?" — the 4 IN_REVIEW rows in this ledger are approved and moved to DONE. Covers assembly, audio mix modes, export presets and share links. Status updated in all three places per `CLAUDE.md` §1.8 (dashboard row · detail block · `Totals:`); `PROGRESS.md` regenerated from the ledgers and independently agrees (129 DONE · 0 IN_REVIEW across all contexts).
**Decisions:** this drains the queue rather than collapsing the state — the option `docs/88-architecture-review.md` §6 offered when it recorded "48 IN_REVIEW · 0 signed off" and called the distinction information-free. IN_REVIEW keeps its meaning for future work; it is the sign-off that was outstanding, and the user is the sign-off authority. Checked before flipping: every row carries both a Tests and a Code link, and no detail block flags open work.
**Deferred:** none.
**Discovered:** with this drained, the whole repo holds 0 READY and 0 IN_PROGRESS — the actionable queue is empty. What remains is 4 PROPOSED (the architecture-review refactors) and 1 BLOCKED (REQ-STB-032 on OQ-115). Per `CLAUDE.md` §13 an empty queue is itself a review trigger.
**Follow-ups:** promote the PROPOSED refactors when the next build session starts.
**Gate:** ledger-only change, no code touched. Verified 0 residual IN_REVIEW in any ledger; row count matched detail-block count in every file before the flip (mismatch would have aborted).

## 2026-07-25 — REQ-ASM-015 audio mode picker (→ IN_REVIEW)
**Done:** Replaced the `audio: native/music/mix` dropdown with one-click buttons in plain language — Take audio · Music only · Both — showing the active mode and what it means, rendered under the clip player, in the Music panel and in Output. Track-dependent modes disable themselves with a reason when no track is attached.
**Decisions:** Put it under the player first: the user asked how to choose while listening to a clip, so the control belongs where the difference is audible, not in a settings panel. One gesture instead of select+Set.
**Deferred:** per-shot audio overrides (one setting still governs the whole film).
**Discovered:** the earlier scripted insert broke a ternary chain in the stage markup — tsc caught it before any browser check ([[tsc-after-scripted-edits]] again).
**Follow-ups:** none.
**Gate:** full suite 199 passed | 14 skipped; tsc clean; browser mode switch verified end-to-end (label + gains), project restored to music.

## 2026-07-25 — REQ-ASM-014 clip preview with the music bed (→ IN_REVIEW)
**Done:** The selected take on the stage now plays through `ClipPlayer`, which runs the project track underneath seeked to the clip's own position in the cut (0:18→0:23 auditions against the export's bars). Mix comes from `previewMix` — the exporter's own rule: music replaces take audio, mix ducks the bed by config.audio.duckDb, native plays the take alone with a "♫ hear with music" audition toggle. Bed follows play/pause/seek/end and resyncs past 0.18s drift; no track ⇒ the UI says so.
**Decisions:** Shared the mix policy with the export path rather than hardcoding gains in the component, so preview and render can't diverge. Gains applied imperatively (a `muted` attribute would fight the user's own volume control). Two elements + drift correction instead of a WebAudio graph — enough for auditioning, noted for later.
**Deferred:** sample-accurate WebAudio mixing; per-clip volume/duck overrides; take-audio waveform.
**Discovered:** no native-mode project exists in the dev DB, so the force-bed toggle is covered by unit tests only; the mix-mode duck was verified live instead (0.2512 == 10^(-12/20)).
**Follow-ups:** none.
**Gate:** RED→GREEN (preview-mix.spec 6); full suite 199 passed | 14 skipped; tsc clean; browser sync + duck verification as above.

## 2026-07-24 — BATCH SIGN-OFF: all IN_REVIEW → DONE (human-approved)
**Done:** USER approved the review queue verbatim: "approve all for now" (evidence: sign-off artifact + per-REQ tests/browser/real-API links in the ledger). All IN_REVIEW rows in this ledger moved to DONE atomically (dashboard row + detail block + Totals).
**Decisions:** approval is provisional ("for now") — regressions reopen the specific REQ, not the batch.
**Deferred / Discovered / Follow-ups:** none. **Gate:** ledger parse verified via scripts/progress.ts.

## 2026-07-23 — REQ-ASM-009 burned captions from MM:SS transcripts (→ IN_REVIEW)
**Done:** red-first transcriptToSrt (stamp→next-stamp cues, duration cap, section-tag stripping; 4 unit cases); snapshot captures burnCaptions+transcript immutably; export pipeline gained a "captions" pass (ffmpeg subtitles/libass, host font mounted into the alpine container, styling from config.asm.captions); captions checkbox on both export forms. Real E2E: Aurora export with the Lyria track's transcript — extracted frame at 2s shows "[Intro]" burned with white/outline styling.
**Decisions:** section tags are structure, not screen text — stripped from lyric lines, kept for label-only cues (instrumental structure display); caption choice is per-export, not a project setting.
**Deferred:** karaoke word-level timing; Remotion caption overlays (ANM-003 full).
**Discovered:** alpine ffmpeg has libass but no fonts — host font mount via fontsdir works.
**Follow-ups:** —
**Gate:** full suite green (120 passed); visual frame verification.

## 2026-07-23 — REQ-ASM-008 archive export guard + archive UI (→ IN_REVIEW)
**Done:** red-first guard in createSnapshot (project_archived via PRJ getProjectStatus — cross-context service call, no table read); archive/unarchive buttons on projects list with collapsed ARCHIVED section; browser-verified full cycle on scratch project.
**Decisions:** guard at snapshot creation only — queueExport requires a snapshot, so it inherits.
**Deferred:** —
**Discovered:** —
**Follow-ups:** —
**Gate:** full suite green (90 passed).

## 2026-07-23 — Context scaffolded (Prompt 0B)
**Done:** lib skeleton, empty ledger, build guide.
**Decisions:** contracts in `./contracts` (Zod canonical).
**Deferred:** ledger seeding → Prompt 1.
**Discovered:** —
**Follow-ups:** seed requirements from docs/15-assembly-export.md.
**Gate:** n/a (no tests yet).

## 2026-07-23 — Ledger seeded (Prompt 1, compact)
**Done:** 8 REQs from docs/15; 3 READY (P1 snapshot/concat/download), 5 PROPOSED.
**Follow-ups:** slice red-first; ffmpeg via docker (no host install).
**Gate:** n/a.

## 2026-07-23 — ASM slice 1: snapshot + concat export (3 × READY → IN_REVIEW)
**Done:** REQ-ASM-001..003 red-first — createSnapshot validates every shot has a selected ready take (offenders named), snapshot immutable vs later selection changes; runNextExport: fetch takes → dockerized ffmpeg concat (-c copy) → export asset under exports/ key → downloadable. Web: Export cut button (disabled until all generated) + exports list with download link. Browser-verified end-to-end; downloaded file validates as ISO MP4 (~1MB, 2× not needed — single-shot cut this round after DB repair).
**Fixed (important):** STB test afterAll deleted ALL take/frame_candidate rows (shared dev DB wiped) — now scoped by suite's shot ids. createSnapshot also rejects dangling selections gracefully instead of crashing.
**Decisions:** ffmpeg via docker image in dev/tests; worker image bakes ffmpeg in prod. Export inline in server action until apps/worker lands.
**Deferred:** audio mix (004), presets/normalization (005), retry UI (006), share links (007), exclusion arm (008).
**Gate:** full suite 26/26 green.

## 2026-07-23 — ASM slice 2: animatic (REQ-ASM-009 → IN_REVIEW)
**Done:** red-first cue math (offsets/total/time-mapping/skip-missing) in src/animatic.ts; AnimaticPlayer client component (fullscreen overlay, RAF clock, per-shot progress segments, space/esc, replay); storyboard header integration with selected-frame fallback to first candidate. Batch "＋ Missing frames" action added. Browser-verified: 5-shot 28s animatic advances per durations with segment fill.
**Also:** SubmitButton (useFormStatus) replaces raw buttons on export/batch — pending labels, no double-submit; home hides archived; duplicate empty "Wake the City" archived.
**Deferred:** music under animatic (needs music attach, REQ-ASM-004 arm); scrubbing.
**Gate:** full suite 31/31 green (see commit).

## 2026-07-23 — ASM slice 3: audio mix modes (REQ-ASM-004 → IN_REVIEW)
**Done:** red-first (after catching my own false-green: initial assertions couldn't distinguish modes — strengthened to codec-level: native→aac, music→mp3 replace w/ fade, mix→aac amix duck). Snapshot captures audio config (mode from project, track from music brief, duck/fade from config); exporter second ffmpeg pass. Migration 0009 (prj.audio_mix_mode) + header selector UI. Browser: 5/5 takes selected, music mode set (form_input — native selects ignore synthetic arrow keys), exported; downloaded file ffprobe-verified mp3 audio (the Suno track).
**Triage (same tick):** Veo 3.1 Fast is $0.15/s (was $0.10 placeholder — 50% under-record on real takes); price table + tests fixed red/green.
**E2E learnings:** a11y ref-clicks on these submit buttons silently no-op — coordinate clicks or form_input are reliable; ffprobe-in-docker is a solid assertion tool.
**Deferred:** per-shot native-audio overrides (OQ-103), music shorter-than-cut padding (BR-ASM-002 arm), presets/normalization (REQ-ASM-005).
**Gate:** full suite green (see commit); browser+ffprobe evidence.

## 2026-07-23 — ASM slice 4: normalization + trim (REQ-ASM-005 → IN_REVIEW)
**Done:** red-first — per-clip normalize pass before concat (scale+pad to config profile per aspect, fps, aac 48k) and trim to snapshot durationS (OQ-104 assembly-side policy). Fixes a real live bug: Aurora mixed a 720p real Veo take with 360p mocks — -c copy concat produced malformed streams. Test: heterogeneous 360p/720p sources → uniform 1280x720, 11s trim. Browser: full Aurora export → ffprobe 1280x720 h264, mp3 music audio, exactly 28.0s (sum of shot durations, was 36–50s untrimmed).
**Ripple handled honestly:** music-mode test bounds updated — old bounds encoded the untrimmed behavior; trim is the spec'd policy.
**Deferred:** loudness normalization (lufs target) → with presets; 1080p profile bump when warranted.
**Gate:** 54 mock green (+4 real skipped).

## 2026-07-23 — ASM slice 5: explicit exclusions (REQ-ASM-008 → IN_REVIEW)
**Done:** red-first — createSnapshot(excludeShotIds): unlisted takeless shots still reject by name (silent drops impossible), unknown ids rejected, all-excluded rejected; exclusions recorded on the snapshot ({shotId,title}) for provenance. UI: "Export N ready · skip M" replaces the disabled button on partial storyboards; exports list shows "skipped: <titles>". Browser: added takeless "Logo out" → button flipped to "Export 5 ready · skip 1" → export succeeded with skip note.
**UX bug found+fixed mid-test:** animatic's global space-key listener hijacked typing in form fields (typing "Logo out" opened the overlay) — now ignores INPUT/TEXTAREA/SELECT targets.
**Gate:** suite green.

## 2026-07-23 — ASM slice 6: share links (REQ-ASM-007 READY → IN_REVIEW)
**Done:** red-first — migration 0014 asm.share_link (fk to export_job, unique token, nullable expires_at/revoked_at) + drizzle table; src/share.ts: createShareLink only for succeeded exports (else `conflict`), token = randomBytes(config.asm.share.tokenBytes).toString("base64url") → 32 url-safe chars; revokeShareLink; resolveShareToken → {exportJob, outputAssetId} | null for revoked/expired/unknown (INV-ASM-005 token-scoped). Public page apps/web/app/s/[token]/page.tsx: valid → dark player over /api/assets/<outputAssetId> + project title; invalid → "This link is no longer available". shareExportAction in apps/web/app/share-actions.ts creates + redirects to /s/<token>.
**Decisions:** token bytes in config (24 → 32 b64url chars, ≥ spec floor), never a literal; expiry optional param on create (no default TTL until a product decision); revoke is idempotent.
**Deferred:** Share button in the exports list (app/p/[id]/page.tsx) → integrator wires shareExportAction (explicitly out of this slice); revoke/expiry management UI → future P5 arm.
**Discovered:** /api/assets/[id] serves any ready asset by uuid (dev-only route, REQ-AST-003 note says signed URLs replace it) — share-scoped asset serving should ride that signed-URL slice.
**Follow-ups:** none.
**Gate:** share.int.spec.ts red (module missing) → green 4/4; libs/asm 18/18 green; full suite green except 2 pre-existing intentionally-red STB baseline tests (REQ-STB-016 WIP commit b4eee04, fail identically without this slice).

## 2026-07-24 — REQ-ASM-012 USER BUG: downloaded export silent (mp3-in-mp4) → aac (→ IN_REVIEW)
**Done:** User clarified the earlier "no sound" report: the DOWNLOADED export was silent in their player. Root cause: music-mode exports encoded `-c:a libmp3lame` — mp3 inside .mp4, which QuickTime/AVFoundation plays silent while Chrome tolerates it (that mismatch is exactly why the earlier browser-side check "heard" audio). Red-first: codec assertion flipped mp3→aac (failed), music-mode args now `-c:a aac` like mix mode (passed 3/3). Both films re-exported; ffprobe confirms aac in each. Tile-player unmute (REQ-STB-031) remains valid — it fixed in-app preview, this fixes the downloaded file.
**Decisions:** aac everywhere in final containers; mp3 allowed only as an intermediate.
**Deferred:** — **Discovered:** export discoverability may still be weak (user asked "how do I even play the video") — EXPORTS section exists at the storyboard bottom with per-export players + download links; watch for further confusion.
**Follow-ups:** user re-download + play. **Gate:** full suite green, tsc clean.

## 2026-07-24 — REQ-ASM-013 finished film plays in-app (→ IN_REVIEW)
**Done:** The user's "how do I even play the video" exposed that EXPORTS had no player — download/share links only. The section now leads with an inline audible <video> of the newest successful export under an explicit "this is your finished film" header, carries id="exports", and exportAction redirects to /p/{id}#exports on completion. Browser-verified: anchor navigation lands on the section with the player showing the film's opening frame.
**Decisions:** only the newest export gets the player (older rows keep links) — one obvious "finished film", no wall of videos.
**Deferred:** — **Discovered:** — **Follow-ups:** user re-test.
**Gate:** full suite green, tsc clean, browser verified.
