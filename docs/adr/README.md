# Architecture Decision Records

One file per decision that is **expensive to reverse**: a dependency, a boundary, a data shape, a
pipeline, a protocol. Cheap decisions do not need one — they need a comment.

## Why these exist

`docs/82-tech-stack.md` §3 held ADR-001…008 as a one-line table: title and status, no context, no
consequences, no alternatives. That is a *register*, not a record. It cannot answer the question
that actually matters two months later — **why**, and what were we trading off — so decisions get
re-litigated from scratch, or silently reversed without anyone noticing they were decisions.

That happened here: the v3 rule "custom text is verbatim, guidelines only shape auto prompts" was a
real architectural decision, recorded only as a test assertion, and it cost four user-visible
defects before it was found and reversed (ADR-010).

## Rules

- **Immutable.** An ADR is never edited after `ACCEPTED` except to add a `Superseded by` line.
  A changed mind is a NEW ADR that supersedes the old one — the trail is the point.
- **Numbered, never reused.** `ADR-NNN-kebab-title.md`.
- **Referenced from code.** `// ADR-003` on the line the decision governs, as `INV-*` already is.
- **Written when the decision is made**, not at the end. If it is being reconstructed later, say so.

## Status vocabulary

| Status | Meaning |
|---|---|
| `PROPOSED` | Written, not yet agreed |
| `ACCEPTED` | In force |
| `SUPERSEDED` | Replaced — carries `Superseded by: ADR-NNN` |
| `DEPRECATED` | No longer applies, nothing replaced it |

## Template

```markdown
# ADR-NNN — <decision in a phrase>

- **Status:** ACCEPTED · <date>
- **Context ref:** <docs/… · REQ-… · USER:<date>>

## Context
What forced a decision. The constraint, not the solution.

## Decision
What we are doing, in the imperative.

## Alternatives considered
What else was real, and why it lost. An ADR with no alternatives was not a decision.

## Consequences
What this makes easy, and what it makes hard or expensive. Be honest about the cost —
this section is the one that pays off later.
```

## Index

| ADR | Decision | Status |
|---|---|---|
| [001](001-node-typescript-monorepo.md) | Node/TypeScript monorepo (Next.js + worker), pnpm + Turborepo | ACCEPTED |
| [002](002-pgboss-on-postgres.md) | pg-boss on Postgres for jobs; no separate broker | ACCEPTED |
| [003](003-zod-canonical-schemas.md) | Zod schemas canonical; OpenAPI generated | ACCEPTED |
| [004](004-uuidv7-ids.md) | UUIDv7 ids | ACCEPTED |
| [005](005-session-cookie-auth.md) | Auth.js session-cookie auth | ACCEPTED |
| [006](006-sse-for-progress.md) | SSE for progress; no WebSocket until bidirectional need | ACCEPTED |
| [007](007-docker-deploy-not-serverless.md) | Docker deploy over serverless — worker runtimes | ACCEPTED |
| [008](008-no-timecode-model.md) | No timecode/track model — shots with decimal seconds | ACCEPTED |
| [009](009-config-is-the-only-source-of-values.md) | All thresholds, prices and model ids in versioned config | ACCEPTED |
| [010](010-one-visual-prompt-pipeline.md) | One visual prompt pipeline; custom text substitutes a stage | ACCEPTED |
| [011](011-reference-names-never-reach-a-model.md) | A reference artist is compiled to craft primitives, never forwarded | ACCEPTED |
| [012](012-consistency-by-reference-not-description.md) | Consistency comes from reference images, not prose | ACCEPTED |
| [013](013-music-led-planning-plans-against-the-real-track.md) | Music-led films plan against the real track, not before it | ACCEPTED |
