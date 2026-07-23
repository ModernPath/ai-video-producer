# 82 — Technology Stack

**Status:** Template — record ADRs as decisions are made (Prompt 0A / 0B).

---

## 1. Proposed stack (starting point — confirm)

| Layer | Choice | Notes |
|-------|--------|-------|
| Editor UI | React + TypeScript | Timeline performance critical |
| API | Node or Elixir — **TBD ADR-001** | |
| DB | PostgreSQL | Tenant RLS |
| Media storage | S3-compatible object store | |
| Transcode / render | ffmpeg workers | Queue: SQS/NATS/Oban — TBD |
| AI | LLM + optional media APIs | Chokepoint service |
| Realtime | WebSocket or SSE — OQ-004 | |

---

## 2. ADR log

| ID | Decision | Status |
|----|----------|--------|
| ADR-001 | API runtime and monorepo tool | OPEN |
| ADR-002 | Timeline state: command log vs snapshot | OPEN (OQ-003) |
| ADR-003 | Schema/codegen (OpenAPI + Zod) | OPEN |

---

## 3. Local development

«Docker Compose services: postgres, minio, api, worker — document after 0B.»

---

## 4. CI

Test rings: unit, integration, contract, E2E (Playwright for editor smoke).
