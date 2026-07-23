# 14 — AI Producer (AGT)

**Context code:** AGT  
**Status:** Template.

---

## 1. Purpose

Agent-assisted production: **ProducerSession**, **Suggestion**, **Generation** — without replacing committed timeline as source of truth until user accepts.

---

## 2. Aggregates

| Aggregate | Notes |
|-----------|--------|
| ProducerSession | Chat thread scoped to project |
| Suggestion | Proposed edit or text |
| Generation | Model-produced asset pending promotion to MED |

---

## 3. Invariants (seed)

| ID | Statement |
|----|-----------|
| INV-AGT-001 | Applying a suggestion must produce a TML EditOperation with trace to suggestion id. |
| INV-AGT-002 | Prompt logs retain model id, token usage, and referenced asset ids (retention policy TBD). |

---

## 4. Governance

- Rate limits and model routing via platform chokepoint.
- User-visible disclosure of AI-generated segments (product/legal — OQ TBD).

---

## 5. Events

`SuggestionCreated`, `SuggestionAccepted`, `SuggestionRejected`, `GenerationCompleted`.

---

## 6. Feature spec

`features/ai-assistant.md`.
