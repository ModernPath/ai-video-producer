# Feature — Library & Style

**Context:** AST (+GEN for edits/sheets) · **Phase:** 4 (music/reference uploads arrive in Phase 3)

## User outcomes

- **Org library** (`/library`): create and manage reusable **Entities** — companies, products, people, characters — each with name, description, and 1–5 reference images; and **Style Kits** (name, style prompt, palette, reference images). Build once, use in every video.
- **AI image editing before use:** open any reference image in the **Edit Studio**, type an instruction ("change his hoodie to a grey suit", "product on white background", "make it neon-noir") → Nano Banana produces a new version; keep original, edited, or both in the ref strip. Full edit lineage visible.
- **Entity sheets:** generate a consistent portrait/angle set for an entity from its description + existing refs; pick the keepers.
- **Project setup:** when creating (or anytime editing) a project, pick entities + one style kit from the library — "who's in this video, and in what style?" Everything generated in the project then carries them.
- **Project library view** (`/p/:id/library`): browse every project asset (frames, takes, uploads, exports) with filters and provenance; remove unused candidates; nothing selected/exported is ever lost.

## Key UI

- Org library: tabbed grid (Companies / Products / People / Characters / Styles), entity cards with ref-strip and "used in N projects".
- Edit Studio: side-by-side source → result, instruction box, iteration history along `edit_of` chain, "use as reference" / "replace original" actions.
- Style Kit editor with live sample-frame preview button (cheap draft frame using the kit).
- Project picker: searchable multi-select of entities + single-select style kit, shown at project creation and in project settings.

## BDD

- `SCN-AST-001` — Attached entity's refs are included in frame/take generations for shots listing it in `direction.entity_ids`.
- `SCN-AST-002` — Upload validates type/size and becomes `ready` with derivative thumb.
- `SCN-AST-003` — AI edit of a person's clothing creates a new ready asset with `edit_of` set; replacing the ref affects future generations only.
- `SCN-AST-004` — Two projects using the same style kit + entity produce a visibly consistent series (manual/eval evidence).

## API

`/library/entities`, `/library/style-kits`, `PUT /projects/{id}/entities`, `PUT /projects/{id}/style-kit`, `POST /assets/{id}/edit`, `/uploads`, `/assets`.

## Rules

INV-AST-001/003/004/006, BR-AST-001/003/004/005/006, BR-GEN-003/006.
