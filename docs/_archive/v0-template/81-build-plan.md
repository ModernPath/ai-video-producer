# 81 — Build Plan

**Status:** Template — replace estimates when stack and team size are known.

---

## 1. Phases (suggested)

| Phase | Goal | Contexts |
|-------|------|----------|
| **0 — Harness** | Repo, CI, empty vertical test | PLT stub |
| **1 — Foundation** | Auth, org, project CRUD | PLT, PRJ |
| **2 — Media** | Upload + ingest + library UI | MED |
| **3 — Timeline MVP** | Insert/trim/split, preview | TML |
| **4 — Export** | Preview render + export preset | RND |
| **5 — AI assist** | Suggestions + accept to timeline | AGT |
| **6 — Polish** | Collaboration, integrations | COL, INT |

---

## 2. Milestones

«Define demo dates and acceptance epics per phase.»

---

## 3. Risks

| Risk | Mitigation |
|------|------------|
| Timeline sync complexity | Start single-user; defer OQ-005 |
| Render cost / queue | Cap concurrent jobs per org |
| AI cost | Metering in PLT/AGT (TBD) |

---

## 4. Traceability

Work packages → epics in `epics/` and/or `REQ-*` in context ledgers; roll up in `WORKLIST.md` and `PROGRESS.md`.
