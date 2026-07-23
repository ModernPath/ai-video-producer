# 03 — Platform Architecture

**Status:** Template — complete during discovery (Prompt 0A).

---

## 1. Target topology

```text
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Editor UI  │────►│  API / BFF  │────►│  Domain services │
│  (React)    │ WS  │             │     │  (libs/<ctx>)    │
└─────────────┘     └──────┬──────┘     └────────┬─────────┘
                           │                      │
                    ┌──────▼──────┐        ┌──────▼──────┐
                    │  Postgres   │        │ Object store │
                    └─────────────┘        │ (media)      │
                                           └──────────────┘
┌─────────────┐     ┌─────────────┐
│ Render      │────►│ ffmpeg /    │
│ workers     │     │ GPU queue   │
└─────────────┘     └─────────────┘
```

Fill in: auth placement (BFF vs direct OIDC), realtime transport for job progress and collaboration (OQ-004).

---

## 2. Applications (placeholder)

| App | Responsibility |
|-----|----------------|
| `editor-web` | Timeline UI, media library, AI panel |
| `api` | HTTP/WS API, auth, orchestration |
| `render-worker` | Preview and export jobs |
| `ingest-worker` | Transcode, proxies, metadata |

---

## 3. Context → deployment mapping

| Context | Typical runtime |
|---------|-----------------|
| PLT, PRJ, TML, AGT | API process |
| MED | API + ingest-worker |
| RND | render-worker |
| INT | API + background jobs |

---

## 4. Cross-cutting concerns

- **Idempotency** on upload complete, edit commands, render submit.
- **Optimistic UI** for timeline ops with server reconciliation (OQ-005).
- **AI chokepoint** — rate limits, model routing, logging (`14-ai-producer.md`).

---

## 5. Open decisions

See `08-open-questions.md` (deployment, realtime, CRDT vs OT for timeline).
