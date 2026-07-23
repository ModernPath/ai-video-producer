# 11 — Projects (PRJ)

**Context code:** PRJ
**Status:** Active.

---

## 1. Purpose

Lifecycle of **Project**: creation with **Brief** and **Format**, membership, archive, and the **cost meter** rollup.

---

## 2. Aggregates

| Aggregate | Notes |
|-----------|--------|
| Project | Root production container; status `active` → `archived` |
| Brief | idea, audience, tone, genre, references (free text + structured fields) |
| Format | aspect ratio (`16:9` \| `9:16` MVP — Omni constraint), resolution tier, target duration seconds |
| ProjectMember | Roles: `owner`, `editor`, `viewer` |

---

## 3. Invariants

| ID | Statement |
|----|-----------|
| INV-PRJ-001 | A project belongs to exactly one organization. |
| INV-PRJ-002 | Every project has exactly one `owner` member at all times. |
| INV-PRJ-003 | Format aspect ratio is immutable once any take exists (frames/takes are ratio-specific); changing it earlier resets generated frames with confirmation. |
| INV-PRJ-004 | Cost meter equals the sum of `succeeded`+`running` generation costs for the project (eventually consistent read model; source of truth is GEN rows). |

## 4. Business rules

| ID | Statement |
|----|-----------|
| BR-PRJ-001 | Project creation requires only a title; brief/format have sensible defaults (16:9, 1080p, 30s target) and can be refined in Script Studio. |
| BR-PRJ-002 | An optional per-project cost cap (≤ org quota) blocks further generations when reached (surfaced before the expensive click, not after). |
| BR-PRJ-003 | Archiving hides the project and blocks new generations/exports; assets and exports remain downloadable. |

---

## 5. Events

`prj.ProjectCreated`, `prj.ProjectUpdated`, `prj.ProjectArchived`, `prj.MemberAdded/Removed`, `prj.CostThresholdReached` (80% and 100% of cap).

## 6. UX / API

`features/projects.md`; API in `07-api-contracts.md` §PRJ.
