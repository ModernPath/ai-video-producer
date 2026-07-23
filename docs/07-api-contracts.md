# 07 — API Contracts

**Status:** Active — conventions fixed, bodies specified per context ledger work.

---

## 1. Conventions

| Topic | Decision |
|-------|----------|
| Style | REST-ish JSON over Next.js route handlers; **Zod schemas are canonical** (ADR-003), OpenAPI generated from Zod |
| Base path | `/api/v1` |
| Auth | Session cookie (Auth.js, ADR-005); share pages use link tokens |
| Tenancy | Derived from session; never in request bodies |
| IDs | UUIDv7 in paths and JSON |
| Errors | `{ "error": { "code", "message", "details?" } }` — codes from GEN §6 taxonomy + `validation_failed`, `not_found`, `forbidden`, `conflict` |
| Pagination | Cursor `?cursor=` on asset/generation lists |
| Async | `202` + resource with `status` for generations/exports; progress via SSE |
| Realtime | `GET /api/v1/projects/{id}/events` — SSE, multiplexed `gen.*`/`ast.*`/`asm.*` (ADR-006) |
| Idempotency | Mutating commands carry `command_id` (also accepted as `Idempotency-Key` header) |

---

## 2. Resource map

### PLT / PRJ

- `GET/POST /projects` · `GET/PATCH /projects/{id}` · `POST /projects/{id}/archive`
- `POST /projects/{id}/members` · `GET /organizations/current` (quota + usage)
- `GET /projects/{id}/cost` — cost meter read model

### STB — script

- `GET /projects/{id}/script` (current + versions)
- `POST /projects/{id}/script/draft` — 202, generation kind `script`
- `POST /projects/{id}/script/revise` — `{ instruction }` → 202
- `POST /projects/{id}/shot-plan/propose` — 202 → proposal resource
- `POST /projects/{id}/shot-plan/{proposalId}/apply` — `{ accepted_change_ids }`

### STB — shots

- `GET /projects/{id}/shots` — storyboard read model (order, direction, status, selected thumbs, candidate counts)
- `POST /projects/{id}/shots` · `PATCH /shots/{id}` (direction/duration) · `DELETE /shots/{id}`
- `POST /projects/{id}/shots/reorder` — `{ ordered_shot_ids }` (atomic)
- `POST /shots/{id}/frames` — `{ slot: "start"|"end", n?, instruction? }` → 202
- `POST /shots/{id}/frames/{frameId}/edit` — `{ instruction }` → 202 (image_edit → new candidate, same slot)
- `POST /shots/{id}/frames/{frameId}/select` · `DELETE /shots/{id}/frames/{frameId}` (unselected only)
- `DELETE /takes/{id}` (unselected only, soft)
- `POST /shots/{id}/takes` — `{ mode?: "framed"|"text" }` → 202 (response includes `estimated_cost_usd`)
- `POST /takes/{id}/retake` — `{ instruction }` → 202
- `POST /takes/{id}/select`

### STB — music

- `POST /projects/{id}/music-brief` — 202 (kind `music_brief`) · `PATCH` to edit text
- `POST /projects/{id}/music-track` — attach ready audio asset · `PATCH /projects/{id}/audio` — `{ mix_mode }`

### GEN

- `GET /projects/{id}/generations?kind=&status=&cursor=` · `GET /generations/{id}` (incl. prompt snapshot) · `POST /generations/{id}/cancel`

### AST

- `POST /projects/{id}/uploads` (or `/library/uploads` for org refs) → presigned target · `POST /uploads/{id}/complete`
- `GET /projects/{id}/assets?kind=` · `GET /assets/{id}` (signed URLs) · `DELETE /assets/{id}` (soft, INV-AST-003)
- **Org library:** `GET/POST/PATCH /library/entities?kind=` · `POST /library/entities/{id}/archive` · `GET/POST/PATCH /library/style-kits` · `/archive`
- **Attachments:** `PUT /projects/{id}/entities` — `{ entity_ids }` · `PUT /projects/{id}/style-kit` — `{ style_kit_id | null }`
- **AI image edit:** `POST /assets/{id}/edit` — `{ instruction }` → 202, generation kind `image_edit`, new asset with `edit_of` lineage

### ASM

- `POST /projects/{id}/snapshots` — validates INV-ASM-002, returns exclusions needing confirmation
- `POST /projects/{id}/exports` — `{ snapshot_id, preset }` → 202 · `GET /exports/{id}` · `POST /exports/{id}/retry`
- `POST /exports/{id}/share-links` · `DELETE /share-links/{id}` · public `GET /s/{token}`

---

## 3. Command envelope (STB mutations)

```json
{
  "command_id": "01890c…",
  "payload": { }
}
```

Replay with same `command_id` returns the original result (`409` only on payload mismatch).

---

## 4. Contract testing

- Zod schemas exported from `libs/<ctx>/contracts`; route handlers parse with them (no hand-rolled types at boundaries).
- Schema-diff check in CI; contract tests tagged `REQ-<CTX>-*`.

## 5. Open questions

OQ-102 (export/take resolution negotiation), OQ-107 (billing surface).
