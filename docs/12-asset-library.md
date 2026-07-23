# 12 — Asset Library (AST)

**Context code:** AST
**Status:** Active.

---

## 1. Purpose

Store and serve **immutable media assets** (generated frames/takes, uploaded reference images and music tracks, exported videos), their derivatives (thumbnails, posters), and the reusable consistency primitives: **Entities** (companies, products, people, characters) and **Style Kits** — both **organization-scoped** so a look and a cast carry across many videos.

---

## 2. Aggregates

| Aggregate | Responsibility |
|-----------|----------------|
| Asset | Metadata + storage key + status; kind: `image` \| `video` \| `audio`; optional `edit_of` lineage |
| UploadSession | Direct-to-storage upload (presigned), for reference images & music tracks |
| Entity | **Org-scoped** named subject: kind `company` \| `product` \| `person` \| `character`, description, 1–`config.entity.max_refs` (5) reference images |
| StyleKit | **Org-scoped** visual identity: name, style prompt fragment, palette notes, reference image asset ids |
| ProjectAttachment | Links entities and one active style kit to a project (selected at project setup, changeable anytime) |

---

## 3. Invariants

| ID | Statement |
|----|-----------|
| INV-AST-001 | A `ready` asset's bytes and metadata are immutable; every edit (AI or upload) creates a **new** asset with `edit_of` set to its source. |
| INV-AST-002 | A `ready` asset references a validated object-storage key with recorded checksum, mime, dimensions/duration. |
| INV-AST-003 | Assets referenced by any STB selection, entity/style-kit reference, or completed export are never hard-deleted (soft delete only, storage retained). Unreferenced candidates may be removed by the user (soft delete). |
| INV-AST-004 | An Entity carries between 1 and `config.entity.max_refs` (5) reference images (Nano Banana consistency guidance). |
| INV-AST-005 | Uploads are validated (mime allowlist, size caps from config, media probe) before `ready`. |
| INV-AST-006 | Entities and Style Kits belong to exactly one organization; a project may attach any number of entities and at most one active Style Kit. |

## 4. Business rules

| ID | Statement |
|----|-----------|
| BR-AST-001 | Entities and Style Kits are org-scoped and reusable across projects; attaching to a project is what exposes them to prompt assembly (BR-GEN-003). |
| BR-AST-002 | Video assets get a poster derivative; image assets get thumbnail derivatives (worker job on `ready`). |
| BR-AST-003 | Entity reference images may be uploaded (e.g. product photos, real people, logos) or generated in-app ("sheet" flow via GEN); both may then be **AI-edited** before use (BR-AST-005). |
| BR-AST-004 | Editing an Entity or Style Kit does not touch past generations (their prompt snapshots are frozen in GEN); it affects only future prompt assembly. Projects always use the entity's *current* refs at generation time. |
| BR-AST-005 | **Reference image editing:** any image asset can be sent to GEN (kind `image_edit`) with an instruction ("change the jacket to red", "make it night") — result is a new asset (`edit_of` lineage). From an entity's ref strip the user can *replace* or *add-alongside* with the edited version. |
| BR-AST-006 | Removing an entity or style kit from the org requires it to be detached from all projects first (or archive, which hides it from pickers but preserves history). |

---

## 5. Storage layout

```
{org_id}/library/{asset_id}/original.{ext}          ← org-scoped (entity/style refs)
{org_id}/{project_id}/assets/{asset_id}/original.{ext}
{org_id}/{project_id}/assets/{asset_id}/thumb_512.webp | poster.jpg
{org_id}/{project_id}/exports/{export_id}/final.mp4
```

Serving: short-lived signed URLs via API; no public buckets (share links are ASM's concern).

---

## 6. Events

`ast.AssetCreated`, `ast.AssetReady`, `ast.AssetFailed`, `ast.AssetRemoved`, `ast.EntityCreated/Updated/Archived`, `ast.StyleKitCreated/Updated/Archived`, `ast.ProjectAttachmentChanged`.

## 7. UX / API

`features/library-style.md` (org library + AI edit studio); API in `07-api-contracts.md` §AST.
