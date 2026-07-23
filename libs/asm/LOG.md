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
