# 40 — Data Model

Canonical schema outline. One Postgres schema per context. SQL DDL is authored as Drizzle migrations in `libs/<ctx>`; this doc is the design authority for tables/columns of record.

---

## 1. Conventions

- Tenant column: `organization_id` on all tenant-owned tables; RLS on every tenant table (INV-PLT-001).
- PKs `uuid` (UUIDv7, ADR-004). Timestamps `timestamptz` UTC (`created_at`, `updated_at`).
- Soft delete `deleted_at` where noted. Money `numeric(10,4)` USD. Durations `numeric(5,1)` seconds.
- Cross-context references beyond `plt.organization`/`plt.user`/`prj.project` are plain uuid columns **without** FK (noted `→ctx` below).

---

## 2. PLT

| Table | Key columns |
|-------|-------------|
| `plt.organization` | name, plan, settings jsonb |
| `plt.user` | email, name, auth fields (Auth.js adapter tables live here) |
| `plt.organization_member` | org, user, role (`admin`\|`member`) |
| `plt.quota` | org, period, limit_usd, limit_video_seconds, consumed_* (transactional with GEN enqueue) |
| `plt.audit_event` | org, principal, action, target, payload jsonb — append-only |

## 3. PRJ

| Table | Key columns |
|-------|-------------|
| `prj.project` | org, title, status (`active`\|`archived`), brief jsonb (idea, audience, tone, genre), aspect_ratio (`16:9`\|`9:16`), resolution_tier, target_duration_s, cost_cap_usd?, audio_mix_mode (`native`\|`music`\|`mix`), deleted_at |
| `prj.project_member` | project, user, role (`owner`\|`editor`\|`viewer`) |

Cost meter is a read model (view/materialization over `gen.generation`), not a column of record.

## 4. STB

| Table | Key columns |
|-------|-------------|
| `stb.script_version` | project, version int, content text (markdown), source (`drafted`\|`revised`\|`manual`), generation_id →gen |
| `stb.shot_plan_proposal` | project, script_version, changes jsonb (add/update/remove diff), status (`proposed`\|`applied`\|`discarded`), generation_id →gen |
| `stb.shot` | project, position int (gapped, resequenced atomically on reorder), title, direction jsonb (schema `13` §7), duration_s, selected_start_frame_id →stb.frame_candidate, selected_end_frame_id, selected_take_id →stb.take, deleted_at |
| `stb.frame_candidate` | shot, slot (`start`\|`end`), image_asset_id →ast, generation_id →gen |
| `stb.take` | shot, video_asset_id →ast, generation_id →gen, retake_of →stb.take?, duration_actual_s, notes |
| `stb.music_brief` | project, prompt text, generation_id →gen?, active_track_asset_id →ast? |

Selected-* columns carry CHECK-backed triggers or app-level enforcement of INV-STB-003/004.

## 5. GEN

| Table | Key columns |
|-------|-------------|
| `gen.generation` | org, project, kind (`script`\|`shot_plan`\|`direction`\|`frame`\|`image_edit`\|`take`\|`retake`\|`music_brief`), target jsonb (shot_id/slot…), model_id, prompt_snapshot jsonb (assembled prompt + attachment asset ids + prompt_template_version), params jsonb, status, attempt int, retry_of?, error_code?, error_detail?, cost_usd?, provider_op_ref?, output_asset_ids uuid[], command_id (unique per project), started_at, finished_at |

Partial indexes on (project, status), (org, created_at) for quota/cost queries.

## 6. AST

| Table | Key columns |
|-------|-------------|
| `ast.asset` | org, project? (null for org-library refs), kind (`image`\|`video`\|`audio`), source (`generated`\|`uploaded`), status (`pending`\|`ready`\|`failed`), storage_key, mime, bytes, checksum, width?, height?, duration_s?, generation_id →gen?, edit_of →ast.asset? (image-edit lineage), deleted_at |
| `ast.asset_derivative` | asset, kind (`thumb`\|`poster`), storage_key, width, height |
| `ast.upload_session` | org, project?, target kind, storage_key, status, expires_at |
| `ast.entity` | **org**, kind (`company`\|`product`\|`person`\|`character`), name, description, ref_asset_ids uuid[] (1–5, INV-AST-004), archived_at |
| `ast.style_kit` | **org**, name, style_prompt text, palette jsonb?, ref_asset_ids uuid[], archived_at |
| `ast.project_entity` | project, entity_id (attachment; INV-AST-006) |
| `ast.project_style_kit` | project, style_kit_id (at most one active per project) |

## 7. ASM

| Table | Key columns |
|-------|-------------|
| `asm.storyboard_snapshot` | project, items jsonb [(shot_id, take_asset_id, duration_s)…], audio jsonb (mix_mode, music_asset_id, ducking), created_by |
| `asm.export_job` | project, snapshot_id, preset, status, progress_stage, output_asset_id →ast?, error_detail?, started_at, finished_at |
| `asm.export_preset` | code, name, width, height, container, video_bitrate, lufs_target (seeded from config) |
| `asm.share_link` | export_job, token (unique), expires_at?, revoked_at? |

## 8. Outbox

| Table | Purpose |
|-------|---------|
| `shared.outbox` | event envelope rows written in-transaction; relayed to pg-boss / SSE fanout (`41-event-catalog.md`) |

---

## 9. RLS

Session sets `app.organization_id`; every tenant table policy: `organization_id = current_setting('app.organization_id')::uuid`. Share-page reads bypass RLS via a security-definer function keyed on the link token only.
