# Agent Instructions — AI Video Producer

**The process manual is [`CLAUDE.md`](CLAUDE.md). Read it first, then return here for the map.**

This file exists because agent tools look for different filenames — `AGENTS.md` is the cross-vendor
convention, `CLAUDE.md` is Claude Code's. They are not alternative processes. There is one process,
it lives in `CLAUDE.md`, and this file only routes you to it.

Nothing here restates a rule, a model id, or a product fact. If you need one, follow the link — a
copy in two places is a copy that will drift.

## Where the process lives

| You need to… | Read |
|---|---|
| Understand the rules that override everything | `CLAUDE.md` §1 — the non-negotiables |
| Do day-to-day implementation work | `CLAUDE.md` §6 — the build loop |
| Know what to test, and at which layer | `CLAUDE.md` §6B |
| Deliver a user-visible capability with BDD/E2E evidence | `CLAUDE.md` §5B — the V-model |
| Record or read an architecture decision | `CLAUDE.md` §4B, then `docs/adr/` |
| Know when something is finished | `CLAUDE.md` §9 — definition of done |
| Start or end a session correctly | `CLAUDE.md` §11 — session ritual |
| Run a review or audit pass | `CLAUDE.md` §13 |
| Find any other document | `CLAUDE.md` §12 — quick reference |

## Where the work lives

| Artifact | Role |
|---|---|
| `WORKLIST.md` | V-model rollup — epic and task rows |
| `libs/<ctx>/REQUIREMENTS.md` | requirement ledgers — current state, status, traceability |
| `libs/<ctx>/LOG.md` | append-only history and reasoning |
| `libs/<ctx>/CLAUDE.md` | per-context build guide — boundary, contracts, commands |
| `BACKLOG.md` | triage inbox for discoveries with no obvious owner |
| `docs/` | canonical design truth — domain behaviour derives from here |
| `prompts.md` | copy-paste session drivers |

## Starting a session

Pick up the next `READY` row in `WORKLIST.md`, or the next `READY` requirement in the target
context's ledger. Not ad-hoc tasks — see `CLAUDE.md` §11.

For product orientation (what this system is and how the pipeline runs), read
[`README.md`](README.md) and `docs/00-overview.md`.
