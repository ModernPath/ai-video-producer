# Agent Instructions — AI Video Producer

This repository builds an **AI-native video editor / producer**. Follow the process defined here and in the linked manuals.

## Read first (every session)

1. **`CLAUDE.md`** — requirement-driven build loop (ledger → red → green → trace).
2. **`req-driven-dev/V-model-loop.md`** — V-model traceability (UR → EPIC → SCN → SR → TASK).
3. **`WORKLIST.md`** — top-level V-model progress rollup and active work rows.
4. **`docs/00-overview.md`** — product thesis, conventions, document map.
5. **`req-driven-dev/interview-flows.md`** — when discussing scope, epics, acceptance scenarios, or review.

## Two coordinated loops

| Loop | Manual | Artifacts |
|------|--------|-----------|
| **Requirements ledger** | `CLAUDE.md` §6 | `libs/<ctx>/REQUIREMENTS.md`, `LOG.md`, `PROGRESS.md` |
| **V-model / epics** | `req-driven-dev/V-model-loop.md` | `epics/`, `WORKLIST.md` |

Use the ledger loop for day-to-day implementation slices. Use the V-model loop when defining or delivering user-visible capabilities as epics with BDD/E2E evidence. Keep `WORKLIST.md`, parent epic records, and ledger rows in sync when both apply.

## Working rules

- **Design truth:** `docs/` — derive requirements from domain docs; do not invent domain behavior without a doc or sourced user input.
- **Start work from:** next `READY` row in `WORKLIST.md` and/or next `READY` requirement in the target context ledger — not ad-hoc tasks.
- **TDD both ways:** failing acceptance/E2E tests before user scenarios complete; failing unit/component/API tests before implementation (`req-driven-dev/AGENTS.md`).
- **Grounding:** record facts and decisions with sources (`USER:`, `DOC:`, `CODE:`, `TEST:`). Unsourced claims → open questions in `docs/08-open-questions.md`.
- **Discoveries:** route to `BACKLOG.md`, a `PROPOSED` ledger row, or `docs/gap-register.md` — never silent deferral.
- **Done gates:** nothing `DONE` / `VALIDATED` / `LOWER_VERIFIED` / `UPPER_VALIDATED` without linked tests, code, and (for epics) recorded human approval per V-model rules.

## Prompts

Copy-paste session drivers live in **`prompts.md`** (discovery, bootstrap, seed ledger, build loop, triage).

## Product focus (orientation)

**AI Video Director** — idea → script (`gemini-3.6-flash`) → storyboard of 4–10s **Shots** → start/end **frames** (Nano Banana) → video **takes** (Gemini Omni Flash) → assembly + music (Suno round-trip) → export.

- **Projects (PRJ)** — brief, format, members, cost meter.
- **Story & Storyboard (STB)** — script, shots, selections, music brief — **system of record**.
- **Generation (GEN)** — all model calls: routing, prompt assembly, provenance, cost.
- **Asset Library (AST)** — immutable assets; org-level Entities (companies/products/people/characters) & Style Kits with AI-editable reference images.
- **Assembly & Export (ASM)** — animatic, concat + audio mix, presets, share links.

Detailed terms and contexts: `docs/01-ubiquitous-language.md`, `docs/02-bounded-contexts.md`.
