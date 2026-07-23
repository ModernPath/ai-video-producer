# Build Log — AST (Asset Library)

## 2026-07-23 — REQ-AST-005 derivatives on ready (PROPOSED → IN_REVIEW)
**Done:** red-first makeAssetThumb (ffmpeg docker; images downscale, videos poster-frame; failure-tolerant + idempotent; unsupported mimes skip); hooks at both ready points (gen executor, uploads); asset API ?thumb=1 with fallback; UI tiles/chips use thumbs, lightbox loads originals. Backfilled 12 existing dev assets. Measured: tile payload 945KB → 21KB.
**Decisions:** derivative stored as sibling storage key + column (not a separate asset row) — simplest provenance-preserving cut; config.derivative {thumbWidth 320, jpegQuality 4}.
**Deferred:** —
**Discovered:** zsh doesn't word-split unquoted vars (backfill args); root scripts can't import drizzle directly (pnpm strict) — pass ids as args instead.
**Follow-ups:** —
**Gate:** full suite green (108 passed); browser + network verified.

## 2026-07-23 — REQ-AST-007 style kits (PROPOSED → IN_REVIEW)
**Done:** org-level style kits (migration 0015: ast.style_kit + prj.project.style_kit_id): create/list in library UI, one selectable per project on the storyboard header; projectStylePrompt feeds stylePrompt in every auto frame/take prompt (STB wiring) and the page's auto-script placeholders show it. Browser E2E: created "Golden Hour Film", selected on Aurora, style text visible in both auto scripts. Closes USER original requirement #3 (styles retained across videos).
**Decisions:** single kit per project (select-at-start model); custom scripts stay verbatim (never styled behind the user's back); AST reads prj.project read-only (allowed-reader), PRJ writes the attachment.
**Deferred:** kit reference images.
**Discovered:** tsx transpiles scripts to CJS from repo root — top-level await in migrate.ts broke; wrapped in .catch.
**Follow-ups:** —
**Gate:** full suite green.

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

## 2026-07-23 — AST slice 2: uploads (REQ-AST-004 → IN_REVIEW)
**Done:** red-first — shared validation core (mime allowlist + size caps, INV-AST-005), presigned PUT sessions (tested via real HTTP PUT to MinIO + HEAD-verified complete), direct server-side path; migration 0007. Browser-verified: mp3 attach on script page.
**Gate:** suite green; real-API ring also green (see GEN LOG).

## 2026-07-23 — AST slice 3: entity library (REQ-AST-006 → IN_REVIEW)
**Done:** red-first — ast.entity (org-scoped, kind, 1–5 ready-image refs INV-AST-004) + ast.project_entity cast attachment (INV-AST-006), migration 0008; STB resolveCast injects entity text blocks into frame+take prompts and entity ref asset ids into provenance; executor fetches ref bytes → provider.refImages (frames); gemini adapter sends multi-image contents. /library page (create with multi-upload, list with thumbs) + CAST bar on storyboard. Browser: entity created with uploaded ref, cast saved, frame generated — DB shows ENTITY block in prompt + ref in provenance.
**Deviation (logged):** MVP cast applies to every shot (matches "select at the beginning" requirement); per-shot direction.entityIds selection is the follow-up arm. Entity image refs to VIDEO (referenceImages param) also follow-up.
**Fixed:** missing providerLimits import in executor (found via failed-generation debug — earlier wholesale rewrite dropped the config import).
**Gate:** 48 mock green (+3 real skipped).

## 2026-07-23 — AST slice 4: client-side image shrink (REQ-AST-009 → IN_REVIEW; USER BUG)
**Done:** ImagePicker client component — createImageBitmap decodes any browser-supported format, canvas downscale to 2048px max edge, JPEG 0.85 re-encode, processed files swapped into the form via DataTransfer, previews with KB shown pre-submit, per-file inline error for undecodable formats. Library create form uses it. Backstop: experimental.serverActions.bodySizeLimit 30mb (correct Next 16 key after an invalid-config warning on first try). config.upload.clientResize added (no literals).
**Evidence:** unit-untestable canvas path → browser E2E designated; automation hit two walls (file_upload bridge 10MB cap → smaller fixture; then extension disconnected mid-run — user's Chrome updating). fixtures/big-ref.png (6MB) ready for the click-through; user retry is the natural verification.
**Gate:** 68 mock green.
