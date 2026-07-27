# Feature — Animations (Remotion)

> **USER epic (2026-07-23):** pure-animation scenes from a prompt + animation overlays on
> generated video scenes. Templates are parameterized React components — props, never code.

**Context:** ANM (render) + GEN (dispatch) + STB (takes) · **Phase:** shipped MVP 2026-07-23  
**Epic:** [EPIC-ANM-001-remotion-animations](../../epics/EPIC-ANM-001-remotion-animations.md)

## User outcomes

- **Animation takes (REQ-ANM-001):** per shot, "✦ Animate · free" renders the TitleCard
  template (brand-dark, spring text, accent underline) at the shot's duration/AR — lands as
  a normal take: selectable, exportable, retake-able, A/B-comparable. $0, ~11s local render.
- **Overlays on generated shots (REQ-ANM-002):** per take, "overlay text… ✦" composites a
  transparent LowerThird (alpha VP8 webm; ffmpeg libvpx + scale2ref) into a NEW take with
  `retake_of` lineage — original untouched, audio passthrough.
- **Burned captions (REQ-ASM-009, ASM):** export checkbox burns the track transcript's
  [MM:SS] lines as styled subtitles (SRT + libass, host font mounted).

## Templates

| id | look | output |
|----|------|--------|
| `title` | full-frame title card, animated text + accent underline | h264 mp4 |
| `lower-third` | sliding accent-bar label, bottom-left | alpha VP8 webm |

## BDD

- `SCN-ANM-001` — Per-shot "✦ Animate" renders a title-card take; selectable and exportable.
- `SCN-ANM-002` — Overlay composites transparent lower-third into a new take with `retake_of` lineage.
- `SCN-ANM-003` — Plan-authored animation shots applied on shot-plan apply (no frame spend).

## Planned (PROPOSED)

- REQ-ANM-003 full: animated caption/lyric overlays driven by MM:SS transcripts.
- Greenscreen keying, multi-layer stacks, overlay timing offsets.
- AI template+props selection from scene prompts (shot plan flags animation shots).

## Rules

- Props-only templates (safety/determinism) — the model never writes executable code.
- Remotion native packages stay external to the Next server bundle (apps/web/next.config.mjs).
- Engine id `remotion-local`; kind `animation`; cost $0 (INV-GEN-003 price table).
