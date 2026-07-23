# Feature — Timeline Editor

**Context:** TML  
**Status:** Template

## User outcomes

- View multi-track timeline with zoom and playhead scrub.
- Insert clip from library at playhead; trim, split, move, delete.
- Undo/redo for edit operations (scope TBD).
- Preview committed sequence in player panel.

## Key UI

- Track headers, clip blocks, playhead, toolbar (split, ripple — defer advanced).
- Snapping and magnetic timeline «optional MVP».

## BDD

- `SCN-TML-001` — Place uploaded clip at playhead (see `req-driven-dev/V-model-loop.md` example)

## API

Sequence read + command batch — `07-api-contracts.md`, `13-timeline-editing.md`.

## Open questions

OQ-001 (timecode), OQ-005 (multi-user).
