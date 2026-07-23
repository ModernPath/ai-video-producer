# Build Log — AST (Asset Library)

## 2026-07-23 — Context scaffolded (Prompt 0B)
**Done:** lib skeleton, empty ledger, build guide.
**Decisions:** contracts in `./contracts` (Zod canonical).
**Deferred:** ledger seeding → Prompt 1.
**Discovered:** —
**Follow-ups:** seed requirements from docs/12-asset-library.md.
**Gate:** n/a (no tests yet).

## 2026-07-23 — ast.asset table created by GEN slice 1 (enabler)
**Done:** minimal `ast.asset` schema + migration 0002 authored as part of GEN pipeline slice (single-writer rules respected — GEN inserts via executor for now; proper AST service + ledger seeding pending).
**Follow-ups:** Prompt 1 for AST; move asset writes behind AST service when storage lands.
**Gate:** covered by GEN integration tests.
