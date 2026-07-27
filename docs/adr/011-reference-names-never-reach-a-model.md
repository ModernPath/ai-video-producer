# ADR-011 — A reference artist is compiled to craft primitives, never forwarded to a model

- **Status:** ACCEPTED · 2026-07-26
- **Context ref:** `epics/EPIC-STB-001-director-briefs.md` (governing constraint) · REQ-GEN-025

## Context
Users describe style by reference: "directed by Aki Kaurismäki". The naive implementation passes
that phrase to the image and video models.

## Decision
A named reference is used **once**, at compile time, with grounded web search, to produce craft
primitives — framing, movement, palette, light, performance, pacing, and what the style refuses.
After that the name is `provenance`: display-only, and stripped from every prompt.

## Alternatives considered
- **Forward the name.** Rejected on two grounds. Providers filter or dilute named-artist prompts, so
  results are inconsistent; and a name averages to a vague impression in an image model, whereas
  "frontal, locked-off, saturated red against olive, no reaction shots" repeats reliably across
  every shot of a film.
- **Ban references entirely.** Rejected: it is how directors actually communicate.

## Consequences
- Easy: consistent, explainable style; the compiled card is editable, so taste is tunable.
- Hard: needs defence in depth. The planner writes prompts too, and wrote "Aki Kaurismäki visual
  style" into a shot’s own `imagePrompt` despite being told not to — so assembled prompts are
  scrubbed at the last boundary, not merely instructed.
- Hard: the scrubber must not damage the card it protects. Splitting references into words deleted
  "earth tones" and "blue hour" for a film referencing *Planet Earth*; single words are now stripped
  only when distinctive.
