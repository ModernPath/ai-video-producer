# 03 — Platform Architecture

**Status:** Active.

---

## 1. Topology

```text
┌──────────────────────────┐        ┌─────────────────────────────┐
│  apps/web (Next.js)      │  SQL   │  Postgres                    │
│  UI (RSC + client)       │◄──────►│  schemas: plt/prj/stb/       │
│  API routes (Zod)        │        │  gen/ast/asm + pg-boss queue │
│  SSE: job/gen progress   │        └─────────────────────────────┘
└────────────┬─────────────┘                     ▲
             │ enqueue (pg-boss)                 │ claim jobs
             ▼                                   │
┌──────────────────────────┐        ┌────────────┴────────────────┐
│  Object storage (S3 API) │◄──────►│  apps/worker (Node)          │
│  originals / derivatives │        │  gen-executor → Gemini APIs  │
│  / exports               │        │  media-worker → ffmpeg       │
└──────────────────────────┘        └─────────────────────────────┘
```

One deployable web app + one deployable worker + Postgres + S3-compatible storage. **No separate queue broker, no microservices** — pg-boss rides on Postgres (ADR-002). Domain logic lives in `libs/<ctx>` and is imported by both apps.

---

## 2. Applications

| App | Responsibility |
|-----|----------------|
| `apps/web` | UI (server components + client editor surfaces), HTTP API, auth, SSE progress streams |
| `apps/worker` | `gen-executor` (Gemini calls, polling async video delivery, cost recording), `media-worker` (probe, thumbnails/posters, assembly ffmpeg) |

Workers are the only processes with Google credentials and ffmpeg. Both apps scale horizontally; job claims are queue-serialized.

---

## 3. Context → runtime mapping

| Context | Runtime |
|---------|---------|
| PLT, PRJ, STB | web (commands + queries) |
| GEN | web (enqueue/read) + worker (execute) |
| AST | web (metadata, presigned uploads) + worker (probe/derivatives) |
| ASM | web (snapshot, presets, share) + worker (ffmpeg assembly) |

---

## 4. Cross-cutting concerns

- **Idempotency:** `command_id` on all STB/ASM commands; `event_id` dedupe on consumers; generation enqueue idempotent per (`command_id`).
- **Progress:** single SSE endpoint per project multiplexing `gen.*` / `asm.*` / `ast.*` events (ADR-006 — SSE over WebSocket: one-directional needs only).
- **Single-user-editing MVP:** last-write-wins per shot with optimistic UI; no OT/CRDT. Shots are coarse-grained enough that conflicts are rare; multi-editor presence is GAP-104.
- **AI chokepoint:** all model calls in GEN executor — routing, retries, quotas, cost, audit (`14-generation.md`).
- **Long jobs:** video generation (tens of seconds) and exports run in worker with heartbeats; web tier never blocks on them.

---

## 5. Deployment

- **Local:** Docker Compose — postgres, minio, web, worker. `GEMINI_API_KEY` in `.env`; a `MOCK_GEN=1` mode returns fixture media so the whole product is developable offline at zero cost (also used by E2E tests).
- **Prod (initial):** Fly.io or Railway (Docker for web + worker; ffmpeg baked into worker image), managed Postgres, Cloudflare R2. Chosen over Vercel serverless because worker jobs exceed serverless execution limits (ADR-007).
