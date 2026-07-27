# ADR-004 — UUIDv7 ids

- **Status:** ACCEPTED · 2026-07-23
- **Context ref:** `docs/00-overview.md` §IDs · reconstructed 2026-07-27

## Context
Ids are generated in the app, not the database, so rows can be created and referenced before a
transaction commits.

## Decision
UUIDv7 everywhere: app-generated, globally unique, time-ordered.

## Alternatives considered
- **Serial/bigint.** Rejected: needs a round-trip before the id exists.
- **UUIDv4.** Rejected: random ids fragment B-tree indexes and destroy natural ordering.

## Consequences
- Easy: `ORDER BY id` is chronological; ids are safe to log and to put in URLs.
- Hard: ids share a long time-prefix, so truncating to 8 characters for display can collide — seen
  in this repo when two generations in the same millisecond displayed identically.
