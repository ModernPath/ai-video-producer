# Epics

V-model epic records for user-visible capabilities. See `CLAUDE.md` §5B and root `WORKLIST.md`.

## Layout

```text
epics/
  README.md
  EPIC-<AREA>-NNN-<short-title>.md
```

Or folder layout with `EPIC.md` + `tasks/` for subagent handoff.

## Naming

Use context-aligned area codes: `PRJ`, `STB`, `GEN`, `ASM`, `ANM`, `AST`, `PLT` (see `docs/02-bounded-contexts.md`).

## Current epics

| Epic | Status | Notes |
|------|--------|-------|
| [EPIC-PRJ-001-golden-thread](./EPIC-PRJ-001-golden-thread.md) | DONE | Phase 1 — retroactive backfill 2026-07-27 |
| [EPIC-STB-002-script-to-animatic](./EPIC-STB-002-script-to-animatic.md) | DONE | Phase 2 — retroactive backfill |
| [EPIC-ASM-001-export-pipeline](./EPIC-ASM-001-export-pipeline.md) | DONE | Phase 3 — retroactive backfill |
| [EPIC-GEN-001-lyria-music](./EPIC-GEN-001-lyria-music.md) | DONE | User Lyria epic — retroactive backfill |
| [EPIC-ANM-001-remotion-animations](./EPIC-ANM-001-remotion-animations.md) | DONE | User Remotion epic — retroactive backfill |
| [EPIC-STB-003-archetype-directing](./EPIC-STB-003-archetype-directing.md) | DONE | Superseded by EPIC-STB-001 for free-form style |
| [EPIC-STB-001-director-briefs](./EPIC-STB-001-director-briefs.md) | IN_PROGRESS | **Only active epic** — upper loop open |

Rollup and work rows: `WORKLIST.md`.
