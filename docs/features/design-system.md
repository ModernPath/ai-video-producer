# Feature — Design System

**Status:** Active seed — expand alongside Phase 2.

## Direction

**"Director's room":** dark-first, cinematic, calm chrome that lets frames and takes be the color. The storyboard must screenshot beautifully — it is the marketing.

- Type: expressive display face for project titles, quiet grotesk for UI.
- Motion (Framer): candidates fade/scale in as they arrive; status fills animate; playhead sweep on animatic. Never noisy.
- Cost/status chips: consistent, glanceable vocabulary across all surfaces.

## Core components (specify with Storybook)

| Component | Notes |
|-----------|--------|
| ShotCard | planned/framed/generated fill states; selected/hover/dragging |
| CandidateStrip | image + video variants; selected ring; provenance popover |
| TakePlayer | A/B compare mode; retake input |
| AnimaticPlayer | shot-boundary scrub bar |
| CostMeter / CostChip | project + per-action |
| GenerationProgress | queued/running/failed states, SSE-driven |
| PromptDisclosure | "what the model saw" |

## Conventions

- Tokens in Tailwind theme; light theme derived, both maintained.
- WCAG AA contrast for chrome over dark surfaces; full keyboard operability (`06` §4).
- Document shortcuts here as they stabilize.

## Placeholder

«Link Storybook when created (Phase 2).»
