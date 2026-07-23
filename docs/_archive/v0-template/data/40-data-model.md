# 40 — Data Model

Canonical database schema (template). Expand per context during Prompt 0A.

---

## 1. Conventions

- Tenant column: `organization_id` on all tenant-owned tables (except `plt` globals).
- Primary keys: UUID (confirm in `82-tech-stack.md`).
- Timestamps: `timestamptz` UTC.
- Soft delete: `deleted_at` where noted.
- **No cross-context FKs** except to `plt.organization` / `plt.user` as allowed in `02-bounded-contexts.md`.

---

## 2. PLT (outline)

| Table | Purpose |
|-------|---------|
| `organization` | Tenant |
| `user` | Identity |
| `organization_member` | Roles |
| `audit_event` | Append-only audit |

«SQL definitions TBD.»

---

## 3. PRJ

| Table | Purpose |
|-------|---------|
| `project` | Production container |
| `project_member` | Access control |
| `project_settings` | Defaults |

---

## 4. MED

| Table | Purpose |
|-------|---------|
| `media_asset` | Metadata, status, storage keys |
| `upload_session` | Multipart state |
| `asset_derivative` | Proxy, thumbnail, waveform |

---

## 5. TML

| Table | Purpose |
|-------|---------|
| `sequence` | Timeline root |
| `track` | Lane |
| `clip` | Placement |
| `edit_command` | Optional command log |

---

## 6. AGT

| Table | Purpose |
|-------|---------|
| `producer_session` | AI chat |
| `producer_message` | Messages |
| `suggestion` | Pending AI ops |
| `generation` | Generated artifacts |

---

## 7. RND

| Table | Purpose |
|-------|---------|
| `render_job` | Queue state |
| `export_preset` | Preset catalog |

---

## 8. COL / INT

«Placeholder tables: `comment`, `provider_connection`, `import_job`.»

---

## 9. Indexes & RLS

Document per-table RLS policies when auth model (OQ-008) is fixed.
