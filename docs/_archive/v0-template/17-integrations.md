# 17 — Integrations (INT)

**Context code:** INT  
**Status:** Template — post-MVP unless required for stock media.

---

## 1. Purpose

Connect **ExternalProvider** accounts; **ImportJob** into MED; optional publish destinations.

---

## 2. Aggregates

ProviderConnection, ImportJob, PublishJob (placeholder).

---

## 3. Patterns

Anti-corruption layer — no provider-specific ids in TML/MED core models without mapping table.

---

## 4. Gaps

GAP-003 (social publish).

---

## 5. Events

`ImportCompleted`, `PublishCompleted`.
