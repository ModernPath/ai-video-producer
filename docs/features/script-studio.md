# Feature — Script Studio

> **USER-canonical flow (2026-07-23):** description in → shots out, each with authored image script, video script, duration, reference images. Breaking into shots must deliver ready-to-fire scripts, not just direction fields.

**Context:** STB (+GEN) · **Phase:** 2

## User outcomes

- Chat a brief into a script draft; iterate with instructions ("funnier", "make it 20s", "add a twist ending").
- Every accepted iteration is a **script version** — browsable, restorable.
- One click: "Break into shots" → reviewable **shot plan** (proposed shots with directions and durations summing ≈ target length).
- After later script edits: "Re-plan" shows a diff against current storyboard; user applies changes selectively (paid takes protected).

## Key UI

- Split view: chat left, current script version right (inline manual edits allowed → `manual` version).
- Shot plan proposal as a card list diff: added / changed / removed, each toggleable before Apply (INV-STB-007 confirmation on removals with takes).
- Music Brief panel: generated Suno prompt, editable, copy button (Phase 3).

## BDD

- `SCN-STB-001` — Brief → script draft → shot plan applied → storyboard populated.
- `SCN-STB-002` — Script revision re-plan preserves shots with selected takes unless confirmed.

## API

`/script/draft`, `/script/revise`, `/shot-plan/propose`, `/shot-plan/{id}/apply`.

## Rules

BR-STB-005, INV-STB-007, OQ-109.
