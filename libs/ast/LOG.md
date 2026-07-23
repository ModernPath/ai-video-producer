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

## 2026-07-23 — Ledger seeded (Prompt 1, compact)
**Done:** 8 REQs from docs/12; 3 READY (P1 storage + serving), 5 PROPOSED one-liners.
**Follow-ups:** slice on 001–003, red-first (per STB learning note).
**Gate:** n/a.

## 2026-07-23 — AST slice 1: real storage (3 × READY → IN_REVIEW)
**Done:** REQ-AST-001..003 red-first — S3 adapter (MinIO, auto-bucket, docs/12 §5 key layout); mock executor now writes real bytes (SVG frames sized per aspect ratio, real 10s MP4 fixture via dockerized ffmpeg into fixtures/); `/api/assets/{id}` streams with mime. Browser-verified: SVG frame renders, MP4 take plays in an HTML5 player, selection flow intact.
**Decisions:** dev serving via API route; signed URLs deferred to prod slice. Fixture MP4 committed (~1MB) so CI needs no ffmpeg.
**Fixed:** cross-file test race — executor now scopes claims by organizationId (proper worker sharding seed).
**Deferred:** REQ-AST-003 route unit test → E2E ring (browser evidence recorded); derivatives (thumb/poster) stay PROPOSED.
**Discovered:** old fixture:// rows purged from dev DB (pre-storage era).
**Gate:** full suite 23/23 green.
