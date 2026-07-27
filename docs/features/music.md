# Feature — Music (Lyria + sync)

**Context:** STB (brief, sync) · GEN (Lyria, transcript) · ASM (captions) · **Phase:** 3+  
**Epic:** [EPIC-GEN-001-lyria-music](../../epics/EPIC-GEN-001-lyria-music.md)

## User outcomes

- Generate a **Music Brief** with timed lyrics (`[Verse]` / `[Chorus]`) unless the project is instrumental.
- One-click **♫ Generate track** (Lyria 3 via Interactions API) attaches a real audio asset to the project.
- **⏱ Transcribe** yields MM:SS lines for lyric-synced cut suggestions and export captions.
- **♪ MUSIC SYNC** panel proposes shot-duration changes aligned to song structure.
- Attach uploaded Suno tracks (legacy round-trip) with duration probing for timeline alignment.

## Key UI

- Music drawer tab: brief editor, generate track, transcript, sync panel.
- Timeline music track with clip boundaries and off-beat warnings (REQ-STB-039).
- Export: burned lyric/section captions checkbox (REQ-ASM-009).

## BDD

- `SCN-GEN-010` — Music brief includes timed lyrics unless instrumental.
- `SCN-GEN-011` — One-click Lyria generates a real track and attaches it to the project.
- `SCN-GEN-012` — Transcript yields MM:SS lines; sync panel suggests cut timings.

## API

Music brief CRUD on project; `requestMusicTrack`, `requestTranscript`; client-side sync apply.

## Rules

BR-STB-007, docs/85 §Music, docs/17 §1.

## Open questions

- OQ-115 — lyric-shot alignment strategy (REQ-STB-032 BLOCKED).
