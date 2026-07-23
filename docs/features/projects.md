# Feature — Projects

**Context:** PRJ · **Phase:** 1

## User outcomes

- Create a project with just a title; refine brief/format later.
- See projects as cards with poster (latest selected frame/export thumb), status, spend, last edit.
- Archive; invite members (Phase 5).

## Key UI

- Project grid; "New video" dialog: title + optional one-line idea + format toggle (16:9 / 9:16) + target length slider (15s–90s).
- Card shows derived progress ("6/8 shots generated") and cost meter chip.

## BDD

- `SCN-PRJ-001` — Create project and land on empty storyboard with "Draft script" call-to-action.

## API

`GET/POST /projects`, `GET /projects/{id}/cost` — `07-api-contracts.md`.

## Rules

BR-PRJ-001 (defaults), INV-PRJ-003 (ratio lock after first take).
