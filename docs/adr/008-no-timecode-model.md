# ADR-008 — No timecode/track model; shots with decimal seconds

- **Status:** ACCEPTED · 2026-07-23
- **Context ref:** `docs/08-open-questions.md` (supersedes OQ-t-001…008) · INV-STB-001

## Context
The product was pivoted from a generic NLE template to a shot-based AI director. An NLE data model —
tracks, timecode, frame rates, edit operations — carries enormous weight.

## Decision
No tracks, no timecode, no frame-accurate model. An ordered list of shots, each with a duration in
decimal seconds, snapped to what the provider supports.

## Alternatives considered
- **Full NLE model.** Rejected: months of work to express what a generator cannot honour anyway —
  the provider decides clip length within its own tolerance.

## Consequences
- Easy: the whole domain is a list; reorder, insert and retime are trivial; the timeline is derived.
- Hard: anything genuinely frame-accurate is out of reach (`REQ-STB-032` lyric alignment is BLOCKED
  partly for this reason), and multi-track audio needed a separate mix concept (BR-ASM-001…003).
