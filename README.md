# AI Video Director

An **AI video director** — from idea to script (`gemini-3.6-flash`), to a storyboard of 4–10s shots with generated start/end frames (Nano Banana) and video takes (Gemini Omni Flash), to an assembled, music-backed export — built with requirement-driven development and V-model traceability.

## Process (read first)

| File | Role |
|------|------|
| [`AGENTS.md`](./AGENTS.md) | Agent entry point |
| [`CLAUDE.md`](./CLAUDE.md) | Build loop: docs → ledger → tests → code |
| [`prompts.md`](./prompts.md) | Copy-paste prompts (0A–4, epic E) |
| [`WORKLIST.md`](./WORKLIST.md) | Epic/task rollup (V-model) |
| [`BACKLOG.md`](./BACKLOG.md) | Discovery triage inbox |
| [`PROGRESS.md`](./PROGRESS.md) | Ledger status rollup |
| [`req-driven-dev/`](./req-driven-dev/) | V-model loop + interview flows |

## Design docs

Canonical product design: [`docs/00-overview.md`](./docs/00-overview.md).

Suggested reading: `01` glossary → `02` contexts → `06` UX → `features/*` → `07` API.

## Getting started

1. Run **Prompt 0A** (`prompts.md`) with your product vision and stack to flesh out `docs/`.
2. Run **Prompt 0B** to bootstrap the monorepo harness.
3. Run **Prompt 1** per bounded context to seed `libs/<ctx>/REQUIREMENTS.md`.
4. Run **Prompt 2** to implement; **Prompt E** / interview flows for epics with BDD/E2E evidence.

## License

MIT (process framework); set product license as needed.
