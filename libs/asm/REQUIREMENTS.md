# Requirements Ledger — ASM (Assembly & Export)

## Dashboard — ASM (Assembly & Export)
Totals: 0 DONE · 8 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 1 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-ASM-001 | Snapshot requires ready takes; immutable | P1 | IN_REVIEW | INV-ASM-001/002 | tests/export.int.spec.ts | src/service.ts |
| REQ-ASM-002 | Export concatenates takes, no generation | P1 | IN_REVIEW | INV-ASM-003 | tests/export.int.spec.ts | src/service.ts |
| REQ-ASM-003 | Export output downloadable as ready asset | P1 | IN_REVIEW | `docs/15` §5 | tests/export.int.spec.ts + browser E2E | src/service.ts, apps/web (exports UI) |
| REQ-ASM-004 | Audio mix modes (native/music/mix) at export | P3 | IN_REVIEW | BR-ASM-001/002 | tests/audio-mix.int.spec.ts + browser/ffprobe | src/service.ts (snapshot audio + mix pass) |
| REQ-ASM-005 | Take normalization at assembly (res/fps/trim) | P3 | IN_REVIEW | BR-ASM-003, OQ-104 trim policy | tests/normalize.int.spec.ts + browser/ffprobe | src/service.ts (normalize pass), config asm.normalize |
| REQ-ASM-006 | Failed exports retain error, retryable | P2 | IN_REVIEW | INV-ASM-004 | tests/retry.int.spec.ts | src/service.ts (retryExport), UI ↻ |
| REQ-ASM-007 | Share links (token, revocable) | P5 | PROPOSED | INV-ASM-005 | — | — |
| REQ-ASM-008 | Explicit exclusion of takeless shots | P2 | IN_REVIEW | INV-ASM-002 (exclusion arm) | tests/exclusions.int.spec.ts + browser | src/service.ts, migration 0010, partial-export UI |
| REQ-ASM-009 | Animatic preview (client-side, zero render cost) | P2 | IN_REVIEW | BR-ASM-005 | tests/animatic.spec.ts + browser E2E | src/animatic.ts, apps/web/components/AnimaticPlayer.tsx |

---

### REQ-ASM-001 — Snapshot requires ready takes; immutable
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-ASM-001, INV-ASM-002
- **Statement:** CreateSnapshot captures ordered (shot, selected take, duration) rows; it fails listing offenders if any non-deleted shot lacks a selected ready take (MVP: no exclusions — REQ-ASM-008). Later storyboard edits never mutate a snapshot.
- **Acceptance criteria:**
  - GIVEN all shots have selected ready takes WHEN CreateSnapshot THEN items match storyboard order.
  - GIVEN a shot without selected take WHEN CreateSnapshot THEN rejected `missing_takes` with shot titles.
  - GIVEN a snapshot WHEN the shot's selection later changes THEN snapshot items are unchanged.
- **Tests:** `tests/export.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-ASM-002 — Export concatenates takes, no generation
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-ASM-003
- **Statement:** Export runs ffmpeg concat over the snapshot's take assets in order; it never calls GEN.
- **Acceptance criteria:**
  - GIVEN a 2-shot snapshot WHEN export runs THEN output is a valid MP4 whose size exceeds either input (concat evidence) and job is `succeeded`.
- **Tests:** `tests/export.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-ASM-003 — Export output downloadable as ready asset
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** `docs/15` §5
- **Statement:** The export job's output is stored under the exports key layout as a ready video asset, downloadable via the asset route.
- **Acceptance criteria:**
  - GIVEN a succeeded export THEN its `output_asset_id` resolves to a ready video asset with bytes in storage.
- **Tests:** `tests/export.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-ASM-009 — Animatic preview (client-side, zero render cost)
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** BR-ASM-005, `docs/06` §4 ("cheap before expensive")
- **Statement:** The storyboard offers an Animatic: each shot's selected start frame (fallback: first candidate) is shown for the shot's duration, in order, with a per-shot progress indication — no server render, no generation calls.
- **Acceptance criteria:**
  - GIVEN shot durations [6,5,6] THEN the cue list yields offsets [0,6,11] and total 17s; time t=7.2 maps to shot 2 (unit-tested math).
  - GIVEN a project with frames WHEN Animatic plays THEN frames advance per durations (browser evidence).
- **Tests:** `tests/animatic.spec.ts` + browser E2E · **Code:** `src/animatic.ts`, `apps/web/components/AnimaticPlayer.tsx` · **Log:** LOG 2026-07-23 (slice 2)

### REQ-ASM-004 — Audio mix modes (native/music/mix) at export
- **Status:** IN_REVIEW · **Stage:** P3 · **Priority:** must
- **Source:** BR-ASM-001/002, `docs/17` §1 (completes the Suno round-trip)
- **Statement:** Snapshots capture the project's audio config (mix mode + attached music track). Export honors it: `native` = take audio concat (current); `music` = takes' audio replaced by the music track (trimmed to cut length, fade-out); `mix` = music bed under native audio at the configured duck level. No generative calls (INV-ASM-003).
- **Acceptance criteria:**
  - GIVEN mode `music` with an attached track THEN the output MP4 has one audio stream and duration ≈ the video cut (ffprobe-verified).
  - GIVEN mode `mix` THEN output contains both sources mixed (audio stream present; music attenuated per config.audio.duckDb).
  - GIVEN mode `native` or no track THEN behavior unchanged.
- **Tests:** `tests/audio-mix.int.spec.ts` (ffprobe codec/duration assertions) + browser E2E · **Code:** `src/service.ts`, migration 0009, audio selector UI · **Log:** LOG 2026-07-23 (slice 3)

### REQ-ASM-005 — Take normalization at assembly (res/fps/trim)
- **Status:** IN_REVIEW · **Stage:** P3 · **Priority:** must
- **Source:** BR-ASM-003, OQ-104 (assembly-side trim policy)
- **Statement:** Before concat, every take is normalized to the configured output profile (resolution by aspect ratio, fps, aac audio) and trimmed to its snapshot durationS. Heterogeneous sources (real Veo 720p + mock 360p, any length) concat into one clean stream; cut length = sum of shot durations.
- **Acceptance criteria:**
  - GIVEN takes of different resolutions/lengths THEN the export has one uniform video stream at the configured profile (ffprobe).
  - GIVEN 10s source takes with snapshot durations [6,5] THEN output duration ≈ 11s (trim, not source length).
  - Audio modes (REQ-ASM-004) still hold on top.
- **Tests:** `tests/normalize.int.spec.ts` (mixed 360p/720p → uniform, trim) + browser/ffprobe (28.0s exact) · **Code:** `src/service.ts` normalize pass, `config.asm.normalize` · **Log:** LOG 2026-07-23 (slice 4)

### REQ-ASM-008 — Explicit exclusion of takeless shots
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** INV-ASM-002 exclusion arm, `docs/features/assembly-export.md`
- **Statement:** CreateSnapshot accepts an explicit exclusion list; only listed takeless shots may be skipped (silent drops stay impossible). Exclusions are recorded on the snapshot for provenance; the UI offers "Export N ready · skip M" when the storyboard is partial.
- **Acceptance criteria:**
  - GIVEN a takeless shot not excluded THEN snapshot creation still rejects naming it.
  - GIVEN it in excludeShotIds THEN the snapshot contains only ready shots and records the exclusion (title + id).
  - Browser: partial storyboard exports the ready subset; exports list notes skipped count.
- **Tests:** `tests/exclusions.int.spec.ts` + browser E2E · **Code:** `src/service.ts` (excludeShotIds + provenance), migration 0010, 'Export N ready · skip M' UI · **Log:** LOG 2026-07-23 (slice 5)

### REQ-ASM-006 — Failed exports retain error, retryable
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** INV-ASM-004
- **Statement:** A failed export keeps its error detail; retry creates a NEW job against the same immutable snapshot. Retrying non-failed jobs is rejected.
- **Acceptance criteria:**
  - GIVEN a failed export WHEN retried after the cause is fixed THEN a new job succeeds against the same snapshot; the failed job keeps its error.
  - GIVEN a succeeded job WHEN retried THEN rejected `conflict`.
  - Browser: failed exports show ↻ retry.

*(PROPOSED 007: share links, `docs/15-assembly-export.md`.)*
