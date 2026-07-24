# Build Log — ASM (Assembly & Export)

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
