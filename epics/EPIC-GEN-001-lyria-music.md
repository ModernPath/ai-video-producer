# EPIC-GEN-001 — Lyria music: brief → track → transcript → sync

- **Status:** DONE — retroactive backfill 2026-07-27
- **Owning context(s):** GEN · STB · ASM · ANM (captions)
- **Build phase:** 3+ (user epic 2026-07-23)

## Sourced user outcome

> **USER:2026-07-23 (BACKLOG):** Lyria 3 music generation epic — timed lyrics in brief, one-click
> full song, MM:SS transcription for lyric-synced cuts and singing characters.
>
> **DOC:docs/00-overview.md#Capability deltas:** Music brief → timed lyrics → Lyria 3 full song →
> MM:SS transcription → captions burned on export.

## Linked user requirements

| UR | Statement | Status |
|---|---|---|
| UR-MUS-001 | As a director I can generate a music track from a brief and attach it to my project. | VALIDATED |
| UR-MUS-002 | As a director I can sync shot cuts to the song timing. | VALIDATED |

## BDD acceptance scenarios

| SCN | Statement | Upper status | Evidence |
|---|---|---|---|
| SCN-GEN-010 | Music brief includes timed lyrics unless instrumental. | UPPER_VALIDATED | `libs/gen/tests/prompt.spec.ts` REQ-STB-023 |
| SCN-GEN-011 | One-click Lyria generates a real track and attaches it to the project. | UPPER_VALIDATED | `libs/stb/tests/music-track.int.spec.ts` + real E2E ($0.08) REQ-GEN-019 |
| SCN-GEN-012 | Transcript yields MM:SS lines; ♪ MUSIC SYNC suggests cut timings. | UPPER_VALIDATED | `tests/music-sync.spec.ts` REQ-STB-025 + `tests/transcript.int.spec.ts` REQ-GEN-020 |

See `docs/features/music.md` for surface spec.

## Ledger trace

| Context | REQ ids |
|---|---|
| STB | REQ-STB-010, REQ-STB-023, REQ-STB-025 |
| GEN | REQ-GEN-019, REQ-GEN-020, REQ-GEN-021 |
| ASM | REQ-ASM-009 (burned captions) |
| ANM | REQ-ANM-003 (partial — animated caption overlays) |

## Deferred (explicit)

| Item | Reason |
|---|---|
| REQ-STB-032 Lyric-shot alignment | BLOCKED on OQ-115 (fill-to-timestamp vs track offset strategy) |

## Human approval

- **USER:2026-07-27:** Retroactive epic backfill — Lyria chain shipped with real-API E2E evidence.
