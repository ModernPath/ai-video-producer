# ADR-009 — All thresholds, prices, model ids and vocabularies live in versioned config

- **Status:** ACCEPTED · 2026-07-23 (recorded 2026-07-27)
- **Context ref:** `CLAUDE.md` §1.4 · `libs/shared/src/config/`

## Context
Model ids, prices and provider limits change without warning, and taste thresholds (shot lengths,
speaking rate, contrast rules) get tuned constantly. Scattered literals make every change a hunt.

## Decision
`@avd/shared/config` is the only place a threshold, rate, price, model id or vocabulary may exist.
Everything else imports. Vocabularies are `as const` and consumers derive their types from them.

## Alternatives considered
- **Env vars for everything.** Rejected: untyped, unversioned, invisible in review.
- **Per-context config.** Rejected: model routing is inherently cross-context.

## Consequences
- Easy: the Veo → Omni route switch and three price corrections were one-line changes. Price errors
  found in triage (a 1000× image mis-encoding, a 50% video under-record) were fixed in one place.
- Hard: it is a large object, and TypeScript does not catch a **duplicated key** — `config.project`
  was declared twice, the later literal silently won, and every threshold read `undefined`.
  Mitigation tracked as REQ-GEN-033 (`no-dupe-keys` lint).
- Hard: the rule is only as good as its enforcement — `casting.ts` kept a private copy of the entity
  kinds, which silently returned `character` for `location` the day `location` was added.
