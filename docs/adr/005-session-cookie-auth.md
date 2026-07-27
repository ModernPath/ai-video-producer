# ADR-005 — Auth.js session-cookie auth

- **Status:** ACCEPTED · 2026-07-23
- **Context ref:** `docs/07-api-contracts.md` · reconstructed 2026-07-27

## Context
A browser product with server components and server actions, plus public share links.

## Decision
Auth.js with session cookies (magic link + Google). Share pages authenticate by link token instead.

## Alternatives considered
- **JWT in localStorage.** Rejected: XSS-exposed, and server components cannot read it.
- **Token per request.** Rejected: server actions post form data; a cookie is the natural carrier.

## Consequences
- Easy: server components and actions are authenticated with no client plumbing.
- Hard: share links are a second auth path and must be reasoned about separately (INV-ASM-005).
- **Not yet implemented.** The dev org is resolved by name; this ADR describes the intended design.
