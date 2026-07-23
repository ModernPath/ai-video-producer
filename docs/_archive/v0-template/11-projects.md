# 11 — Projects (PRJ)

**Context code:** PRJ  
**Status:** Template.

---

## 1. Purpose

Lifecycle of **Project**: create, configure, archive, membership, default sequence reference.

---

## 2. Aggregates

| Aggregate | Notes |
|-----------|--------|
| Project | Root production container |
| ProjectMember | Roles: owner, editor, viewer (confirm) |
| ProjectSettings | Frame rate, resolution defaults |

---

## 3. Invariants (seed)

| ID | Statement |
|----|-----------|
| INV-PRJ-001 | A project belongs to exactly one organization. |
| INV-PRJ-002 | Every project has exactly one owner member at creation. |

---

## 4. State machine — Project

`draft` → `active` → `archived` (define transitions and commands).

---

## 5. Events

`ProjectCreated`, `ProjectArchived`, `ProjectMemberAdded` — payloads in `data/41-event-catalog.md` (TBD).

---

## 6. Open questions

OQ-002 (multiple sequences).
