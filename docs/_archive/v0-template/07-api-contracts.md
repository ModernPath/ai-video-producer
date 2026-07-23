# 07 — API Contracts

**Status:** Template — define conventions first, then resources per context.

---

## 1. Conventions (to confirm)

| Topic | Placeholder decision |
|-------|----------------------|
| Base path | `/api/v1` |
| Auth | Bearer token or session cookie via BFF — see OQ-008 |
| Tenancy | Derived from auth; no `organization_id` in body for creates |
| IDs | UUID in path and JSON |
| Errors | `{ "error": { "code", "message", "details" } }` |
| Pagination | cursor `?cursor=` for asset lists |
| Async jobs | `202` + `job_id` for ingest/render |
| Realtime | WebSocket or SSE for `RenderJob` / upload progress — OQ-004 |

Schema source of truth: OpenAPI or Zod — record ADR in `82-tech-stack.md`.

---

## 2. Resource map (outline)

### PLT / PRJ

- `GET/POST /organizations/.../projects`
- `GET/PATCH /projects/{id}`
- `POST /projects/{id}/members`

### MED

- `POST /projects/{id}/uploads` — start upload session
- `POST /uploads/{id}/parts` — multipart
- `GET /projects/{id}/assets`
- `GET /assets/{id}`

### TML

- `GET /projects/{id}/sequence`
- `POST /projects/{id}/sequence/commands` — append edit operations (batch)
- `GET /projects/{id}/sequence/history` — optional

### AGT

- `POST /projects/{id}/producer/sessions`
- `POST /producer/sessions/{id}/messages`
- `GET /projects/{id}/suggestions`
- `POST /suggestions/{id}/accept` | `/reject`

### RND

- `POST /projects/{id}/renders` — preview or export
- `GET /renders/{id}`

Detail request/response bodies when domain docs §11 are filled.

---

## 3. Edit command pattern (TML)

Prefer **command envelope** for timeline mutations:

```json
{
  "command_id": "uuid",
  "type": "InsertClip",
  "payload": { }
}
```

Idempotency-Key header = `command_id`. Document full command catalog in `13-timeline-editing.md`.

---

## 4. Contract testing

- Consumer-driven or schema diff in CI.
- Link contract tests to `REQ-TML-*` / `REQ-MED-*` in ledgers.

---

## 5. Open questions

Blocking API shape: `08-open-questions.md` OQ-001, OQ-004, OQ-005, OQ-008.
