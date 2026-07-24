# Requirements Ledger — ASM (Assembly & Export)

## Dashboard — ASM (Assembly & Export)
Totals: 11 DONE · 1 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 0 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-ASM-001 | Snapshot requires ready takes; immutable | P1 | DONE | INV-ASM-001/002 | tests/export.int.spec.ts | src/service.ts |
| REQ-ASM-012 | Exports use universally playable audio (aac) | P7 | IN_REVIEW | USER BUG 2026-07-24 (downloaded export silent in QuickTime) | tests/audio-mix.int.spec.ts (music mode aac) | src/service.ts music-mode -c:a aac |
| REQ-ASM-002 | Export concatenates takes, no generation | P1 | DONE | INV-ASM-003 | tests/export.int.spec.ts | src/service.ts |
| REQ-ASM-003 | Export output downloadable as ready asset | P1 | DONE | `docs/15` §5 | tests/export.int.spec.ts + browser E2E | src/service.ts, apps/web (exports UI) |
| REQ-ASM-004 | Audio mix modes (native/music/mix) at export | P3 | DONE | BR-ASM-001/002 | tests/audio-mix.int.spec.ts + browser/ffprobe | src/service.ts (snapshot audio + mix pass) |
| REQ-ASM-005 | Take normalization at assembly (res/fps/trim) | P3 | DONE | BR-ASM-003, OQ-104 trim policy | tests/normalize.int.spec.ts + browser/ffprobe | src/service.ts (normalize pass), config asm.normalize |
| REQ-ASM-006 | Failed exports retain error, retryable | P2 | DONE | INV-ASM-004 | tests/retry.int.spec.ts | src/service.ts (retryExport), UI ↻ |
| REQ-ASM-007 | Share links (token, revocable) | P5 | DONE | INV-ASM-005 | tests/share.int.spec.ts | src/share.ts, migration 0014, apps/web /s/[token] |
| REQ-ASM-009 | Burned lyric/section captions on export | P6 | DONE | USER Lyria/Remotion epics; REQ-GEN-020 | tests/captions.spec.ts + real E2E frame check | src/captions.ts, snapshot flag, subtitles pass, captions checkbox |
| REQ-ASM-008 | Archived projects cannot export | P5 | DONE | BR-PRJ-003 (workflow-merge follow-up) | tests/archive-guard.int.spec.ts + browser E2E | src/service.ts createSnapshot guard, archive UI apps/web/app/page.tsx |
| REQ-ASM-008 | Explicit exclusion of takeless shots | P2 | DONE | INV-ASM-002 (exclusion arm) | tests/exclusions.int.spec.ts + browser | src/service.ts, migration 0010, partial-export UI |
| REQ-ASM-009 | Animatic preview (client-side, zero render cost) | P2 | DONE | BR-ASM-005 | tests/animatic.spec.ts + browser E2E | src/animatic.ts, apps/web/components/AnimaticPlayer.tsx |

---

### REQ-ASM-001 — Snapshot requires ready takes; immutable
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-ASM-001, INV-ASM-002
- **Statement:** CreateSnapshot captures ordered (shot, selected take, duration) rows; it fails listing offenders if any non-deleted shot lacks a selected ready take (MVP: no exclusions — REQ-ASM-008). Later storyboard edits never mutate a snapshot.
- **Acceptance criteria:**
  - GIVEN all shots have selected ready takes WHEN CreateSnapshot THEN items match storyboard order.
  - GIVEN a shot without selected take WHEN CreateSnapshot THEN rejected `missing_takes` with shot titles.
  - GIVEN a snapshot WHEN the shot's selection later changes THEN snapshot items are unchanged.
- **Tests:** `tests/export.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-ASM-002 — Export concatenates takes, no generation
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-ASM-003
- **Statement:** Export runs ffmpeg concat over the snapshot's take assets in order; it never calls GEN.
- **Acceptance criteria:**
  - GIVEN a 2-shot snapshot WHEN export runs THEN output is a valid MP4 whose size exceeds either input (concat evidence) and job is `succeeded`.
- **Tests:** `tests/export.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-ASM-003 — Export output downloadable as ready asset
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** `docs/15` §5
- **Statement:** The export job's output is stored under the exports key layout as a ready video asset, downloadable via the asset route.
- **Acceptance criteria:**
  - GIVEN a succeeded export THEN its `output_asset_id` resolves to a ready video asset with bytes in storage.
- **Tests:** `tests/export.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-ASM-009 — Animatic preview (client-side, zero render cost)
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Source:** BR-ASM-005, `docs/06` §4 ("cheap before expensive")
- **Statement:** The storyboard offers an Animatic: each shot's selected start frame (fallback: first candidate) is shown for the shot's duration, in order, with a per-shot progress indication — no server render, no generation calls.
- **Acceptance criteria:**
  - GIVEN shot durations [6,5,6] THEN the cue list yields offsets [0,6,11] and total 17s; time t=7.2 maps to shot 2 (unit-tested math).
  - GIVEN a project with frames WHEN Animatic plays THEN frames advance per durations (browser evidence).
- **Tests:** `tests/animatic.spec.ts` + browser E2E · **Code:** `src/animatic.ts`, `apps/web/components/AnimaticPlayer.tsx` · **Log:** LOG 2026-07-23 (slice 2)

### REQ-ASM-004 — Audio mix modes (native/music/mix) at export
- **Status:** DONE · **Stage:** P3 · **Priority:** must
- **Source:** BR-ASM-001/002, `docs/17` §1 (completes the Suno round-trip)
- **Statement:** Snapshots capture the project's audio config (mix mode + attached music track). Export honors it: `native` = take audio concat (current); `music` = takes' audio replaced by the music track (trimmed to cut length, fade-out); `mix` = music bed under native audio at the configured duck level. No generative calls (INV-ASM-003).
- **Acceptance criteria:**
  - GIVEN mode `music` with an attached track THEN the output MP4 has one audio stream and duration ≈ the video cut (ffprobe-verified).
  - GIVEN mode `mix` THEN output contains both sources mixed (audio stream present; music attenuated per config.audio.duckDb).
  - GIVEN mode `native` or no track THEN behavior unchanged.
- **Tests:** `tests/audio-mix.int.spec.ts` (ffprobe codec/duration assertions) + browser E2E · **Code:** `src/service.ts`, migration 0009, audio selector UI · **Log:** LOG 2026-07-23 (slice 3)

### REQ-ASM-005 — Take normalization at assembly (res/fps/trim)
- **Status:** DONE · **Stage:** P3 · **Priority:** must
- **Source:** BR-ASM-003, OQ-104 (assembly-side trim policy)
- **Statement:** Before concat, every take is normalized to the configured output profile (resolution by aspect ratio, fps, aac audio) and trimmed to its snapshot durationS. Heterogeneous sources (real Veo 720p + mock 360p, any length) concat into one clean stream; cut length = sum of shot durations.
- **Acceptance criteria:**
  - GIVEN takes of different resolutions/lengths THEN the export has one uniform video stream at the configured profile (ffprobe).
  - GIVEN 10s source takes with snapshot durations [6,5] THEN output duration ≈ 11s (trim, not source length).
  - Audio modes (REQ-ASM-004) still hold on top.
- **Tests:** `tests/normalize.int.spec.ts` (mixed 360p/720p → uniform, trim) + browser/ffprobe (28.0s exact) · **Code:** `src/service.ts` normalize pass, `config.asm.normalize` · **Log:** LOG 2026-07-23 (slice 4)

### REQ-ASM-008 — Explicit exclusion of takeless shots
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Source:** INV-ASM-002 exclusion arm, `docs/features/assembly-export.md`
- **Statement:** CreateSnapshot accepts an explicit exclusion list; only listed takeless shots may be skipped (silent drops stay impossible). Exclusions are recorded on the snapshot for provenance; the UI offers "Export N ready · skip M" when the storyboard is partial.
- **Acceptance criteria:**
  - GIVEN a takeless shot not excluded THEN snapshot creation still rejects naming it.
  - GIVEN it in excludeShotIds THEN the snapshot contains only ready shots and records the exclusion (title + id).
  - Browser: partial storyboard exports the ready subset; exports list notes skipped count.
- **Tests:** `tests/exclusions.int.spec.ts` + browser E2E · **Code:** `src/service.ts` (excludeShotIds + provenance), migration 0010, 'Export N ready · skip M' UI · **Log:** LOG 2026-07-23 (slice 5)

### REQ-ASM-006 — Failed exports retain error, retryable
- **Status:** DONE · **Stage:** P2 · **Priority:** must
- **Source:** INV-ASM-004
- **Statement:** A failed export keeps its error detail; retry creates a NEW job against the same immutable snapshot. Retrying non-failed jobs is rejected.
- **Acceptance criteria:**
  - GIVEN a failed export WHEN retried after the cause is fixed THEN a new job succeeds against the same snapshot; the failed job keeps its error.
  - GIVEN a succeeded job WHEN retried THEN rejected `conflict`.
  - Browser: failed exports show ↻ retry.

### REQ-ASM-009 — Burned lyric/section captions on export
- **Status:** DONE · **Stage:** P6 · **Priority:** should · **Owner:** —
- **Raised-by:** USER epics (lyric-synced timing); first consumer of REQ-GEN-020 transcripts
- **Source:** docs/85 §Music; REQ-GEN-020
- **Statement:** An export can burn the track transcript's [MM:SS] lines as styled captions: transcript → SRT (per-line timing to the next stamp, capped at cut length; leading section tags stripped from lyric lines), applied via ffmpeg subtitles/libass with a host-mounted font; the choice and transcript are captured immutably in the snapshot.
- **Acceptance criteria:**
  - GIVEN a transcript WHEN converted THEN SRT cues run stamp→next-stamp, drop past-duration lines, strip inline section tags (unit-tested).
  - GIVEN burnCaptions with a transcribed track WHEN exported THEN the final video shows the caption text (verified by frame extraction).
  - GIVEN no transcript THEN the flag is a no-op.
- **Tests:** `tests/captions.spec.ts` · real E2E: Aurora captioned export → extracted frame shows "[Intro]" burned with outline styling · **Code:** `src/captions.ts`, createSnapshot burnCaptions+transcript, subtitles pass (progressStage "captions"), config.asm.captions, export-form checkbox · **Log:** LOG 2026-07-23
- **Deferred / notes:** karaoke-style word timing + Remotion-rendered caption overlays (ANM-003 full) later; font path env-overridable (CAPTION_FONT_FILE) for the prod container.

### REQ-ASM-008 — Archived projects cannot export
- **Status:** DONE · **Stage:** MVP · **Priority:** must · **Owner:** —
- **Raised-by:** BACKLOG (prj-backfill agent noted BR-PRJ-003 covered generation but not export)
- **Source:** BR-PRJ-003 (`docs/11`)
- **Statement:** Export snapshot creation shall reject archived projects with `project_archived`; unarchiving restores the ability. Archive/unarchive is operable from the projects list.
- **Acceptance criteria:**
  - GIVEN an archived project WHEN createSnapshot THEN rejected `project_archived`, no snapshot row.
  - GIVEN the project is unarchived WHEN createSnapshot THEN the archive guard does not fire.
  - GIVEN the projects list WHEN a project is archived THEN it moves to the ARCHIVED section (unarchive available) and disappears from active.
- **Tests:** `tests/archive-guard.int.spec.ts` + browser E2E (archive → hidden → unarchive cycle) · **Code:** `src/service.ts` (createSnapshot guard via PRJ getProjectStatus), `apps/web/app/page.tsx` + archive/unarchive actions · **Log:** LOG 2026-07-23
- **Deferred / notes:** guard placed at snapshot creation (single entry to export pipeline); queueExport inherits it since snapshots are prerequisite.

### REQ-ASM-007 — Share links (token, revocable)
- **Status:** DONE · **Stage:** P5 · **Priority:** should
- **Raised-by:** seeded from `docs/15-assembly-export.md` (Prompt 1)
- **Source:** INV-ASM-005 (`docs/15` §3)
- **Statement:** A share link grants access ONLY to its linked export's output: it can be created only for a `succeeded` export job, carries a crypto-random url-safe token (32+ chars), supports optional expiry, and is revocable. Resolving a revoked, expired, or unknown token yields nothing.
- **Acceptance criteria:**
  - GIVEN a succeeded export WHEN createShareLink THEN a link exists with a url-safe token of 32+ chars.
  - GIVEN a queued or failed export WHEN createShareLink THEN rejected `conflict` (only succeeded outputs are shareable).
  - GIVEN a valid token WHEN resolveShareToken THEN it returns the export job and its `outputAssetId` (token-scoped: exactly that export's output).
  - GIVEN a revoked link, an expired link, or an unknown token WHEN resolveShareToken THEN `null`.
  - Public page `/s/<token>`: valid → video player for the output asset + project title; invalid → "This link is no longer available".
- **Tests:** `tests/share.int.spec.ts`
- **Code:** `src/share.ts` (// INV-ASM-005), `src/schema.ts` (shareLink), migration `0014_share_links.sql`, `config.asm.share.tokenBytes`, `apps/web/app/s/[token]/page.tsx`, `apps/web/app/share-actions.ts`
- **Log:** LOG 2026-07-23 (slice 6)
- **Deferred / notes:** exports-list Share button wiring in `app/p/[id]/page.tsx` is integrated later (out of this slice); `shareExportAction` is ready for it.

### REQ-ASM-012 — Exports use universally playable audio
- **Status:** IN_REVIEW  ·  **Stage:** P7  ·  **Priority:** must  ·  **Owner:** —
- **Raised-by:** USER BUG 2026-07-24: "exported video did not contain audio" — music-mode exports muxed the Lyria mp3 stream as mp3-in-mp4, which QuickTime/AVFoundation plays SILENT (Chrome tolerates it, which masked the bug in browser checks)
- **Source:** BR-ASM-001/002 (music mode); playback compatibility
- **Statement:** Every export encodes audio as AAC regardless of mix mode; mp3 never reaches the final container.
- **Acceptance criteria:**
  - GIVEN a music-mode export THEN ffprobe shows exactly one aac audio stream (red-first test updated from the old mp3 assertion).
  - GIVEN mix/native modes THEN aac as before (regression pinned).
- **Tests:** `tests/audio-mix.int.spec.ts` · **Code:** `src/service.ts` music-mode args · **Log:** LOG 2026-07-24
- **Deferred / notes:** both live films re-exported with aac; old silent-in-QuickTime exports remain as prior rows (immutable assets).
