# Feature — Assembly & Export

**Context:** ASM · **Phase:** 3

## User outcomes

- Review the final cut summary: ordered shots, selected takes, total duration, audio plan.
- Shots without a selected take are flagged; user excludes them explicitly or goes back (INV-ASM-002).
- Choose audio: native / music / mix (ducking) — preview mix on the rough cut before rendering.
- Pick preset (social-vertical / social-landscape / master), export, watch staged progress, download.
- Create/revoke a share link; share page plays the video with title + poster.
- Music Brief lives here too: render with Lyria, or copy the prompt to Suno and upload the track → fit indicator (track vs video length).

## Key UI

- Export drawer: cut summary → audio step → preset step → confirm (notes that export is free — generation already paid).
- Job list with stage progress (normalize → concat → mix → mux), retry on failure with error detail.
- Public share page `/s/:token` — clean player, no auth.

## BDD

- `SCN-ASM-001` — Export produces downloadable MP4 matching snapshot order and durations.
- `SCN-ASM-002` — Mix mode `mix` ducks native audio under music per config.
- `SCN-ASM-003` — Storyboard edits after export do not alter the produced file (snapshot immutability).

## API

`/snapshots`, `/exports`, `/exports/{id}/retry`, `/share-links`, `GET /s/{token}`.

## Rules

INV-ASM-001…005, BR-ASM-001…005, OQ-103/110/111.
