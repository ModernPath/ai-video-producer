# ADR-006 — SSE for progress; no WebSocket until a bidirectional need

- **Status:** ACCEPTED · 2026-07-23
- **Context ref:** `docs/03-platform-architecture.md` · REQ-GEN-017

## Context
The UI must reflect generation progress without polling. All traffic is server → client.

## Decision
One SSE endpoint per project, multiplexing `gen.*` / `ast.*` / `asm.*` events.

## Alternatives considered
- **WebSocket.** Rejected: bidirectional machinery for a one-directional need.
- **Polling.** Rejected: latency or load, pick one.

## Consequences
- Easy: plain HTTP; reconnects for free; one endpoint.
- Hard: **an event stream that triggers re-renders races anything else re-rendering.** Refreshing on
  every event tore down the tree mid-commit of a server action and threw from React internals
  (REQ-GEN-029). Refreshes must be coalesced and non-urgent.
