# Build Log — ASM (Assembly & Export)

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
