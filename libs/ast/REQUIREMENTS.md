# Requirements Ledger — AST (Asset Library)

## Dashboard — AST (Asset Library)
Totals: 0 DONE · 6 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 3 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-AST-001 | Object storage put/get round-trip | P1 | IN_REVIEW | INV-AST-002 | tests/storage.int.spec.ts | src/storage.ts |
| REQ-AST-002 | Generated assets carry real validated bytes | P1 | IN_REVIEW | INV-AST-002 | tests/generated-bytes.int.spec.ts | ../gen/src/executor.ts, ../gen/src/fixtures.ts |
| REQ-AST-003 | Assets served to UI via streaming route | P1 | IN_REVIEW | `docs/12` §5 | browser E2E (LOG 2026-07-23) | apps/web/app/api/assets/[id]/route.ts |
| REQ-AST-004 | Uploads (presigned + direct) with validation | P3 | IN_REVIEW | INV-AST-005 | tests/uploads.int.spec.ts + browser E2E | src/uploads.ts |
| REQ-AST-009 | Client-side image shrink + previews + any format | P1 | IN_REVIEW | USER BUG 2026-07-23 (1MB action limit) | browser E2E pending (extension dropped; user to retry) | components/ImagePicker.tsx, next.config, config.clientResize |
| REQ-AST-005 | Derivatives (thumb/poster) on ready | P2 | PROPOSED | BR-AST-002 | — | — |
| REQ-AST-006 | Entity library: org entities, refs, project cast | P4 | IN_REVIEW | INV-AST-004/006, BR-AST-001/003 | tests/entities.int.spec.ts, ../stb/tests/cast.int.spec.ts + browser | src/entities.ts, apps/web (library, cast) |
| REQ-AST-007 | Style kits org-scoped + project attachment | P4 | PROPOSED | INV-AST-006, BR-AST-001 | — | — |
| REQ-AST-008 | Soft-delete protection for referenced assets | P2 | PROPOSED | INV-AST-003 | — | — |

---

### REQ-AST-001 — Object storage put/get round-trip
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-AST-002
- **Statement:** The storage adapter writes bytes to S3-compatible storage under the documented key layout and reads them back intact (bucket auto-ensured in dev).
- **Acceptance criteria:**
  - GIVEN bytes and a key WHEN put then get THEN identical bytes and recorded mime return.
- **Tests:** see dashboard row · **Code:** see dashboard row · **Log:** LOG 2026-07-23 (slice 1)

### REQ-AST-002 — Generated assets carry real validated bytes
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-AST-002
- **Statement:** Mock (and later real) generations store actual media bytes; the asset row records storage key, mime, and byte size — no fixture:// placeholders.
- **Acceptance criteria:**
  - GIVEN a completed mock frame THEN storage holds an image (SVG/PNG) at the asset's key and `bytes > 0`.
  - GIVEN a completed mock take THEN storage holds a playable MP4 at the asset's key.
- **Tests:** see dashboard row · **Code:** see dashboard row · **Log:** LOG 2026-07-23 (slice 1)

### REQ-AST-003 — Assets served to UI via streaming route
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** `docs/12` §5 (signed URLs later; dev streams via API)
- **Statement:** `GET /api/assets/{id}` streams the asset's bytes with correct content-type for ready, non-deleted assets.
- **Acceptance criteria:**
  - GIVEN a ready asset THEN the route returns 200 + bytes + mime; unknown id → 404.
- **Tests:** see dashboard row · **Code:** see dashboard row · **Log:** LOG 2026-07-23 (slice 1)

### REQ-AST-009 — Client-side image shrink + previews + any format
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Raised-by:** USER BUG 2026-07-23 — large ref upload hit Next server-action 1MB body limit ("cant load large images, please shrink them on the browser client… Support all image formats and show previews")
- **Statement:** Image pickers downscale client-side before upload (canvas, max edge from config, JPEG re-encode), accept any browser-decodable format (converted to JPEG), and show previews with sizes before submit. Server action body limit raised as backstop; server allowlist unchanged (client normalizes).
- **Acceptance criteria:**
  - GIVEN a multi-MB image THEN upload succeeds (client sends a downscaled JPEG well under the limit) and a preview is shown before submitting.
  - GIVEN webp/gif/bmp/avif input THEN it converts and uploads; undecodable files produce a clear inline error, not a crash.
- **Tests:** browser E2E (large generated image) · **Code:** — · **Log:** —

### REQ-AST-004 — Uploads (presigned + direct) with validation
- **Status:** IN_REVIEW · **Stage:** P3 · **Priority:** must
- **Source:** INV-AST-005, `docs/12` §2/§4
- **Statement:** Uploads validate mime allowlist + size caps from config before any asset becomes `ready`. Two paths share one core: presigned PUT sessions (browser→storage, prod path) and direct server-side bytes (dev/simple path). Media probe (duration/dimensions) deferred to derivatives slice (REQ-AST-005).
- **Acceptance criteria:**
  - GIVEN a disallowed mime or oversize payload THEN session creation is rejected `validation_failed`.
  - GIVEN a presigned session WHEN bytes are PUT to the URL and the session completed THEN a ready asset exists with matching byte size.
  - GIVEN direct bytes THEN a ready asset exists (browser evidence: attach a music track).
- **Tests:** `tests/uploads.int.spec.ts` + browser E2E (track attach) · **Code:** `src/uploads.ts`, migration 0007 · **Log:** LOG 2026-07-23 (slice 2)

### REQ-AST-006 — Entity library: org entities, refs, project cast
- **Status:** IN_REVIEW · **Stage:** P4 · **Priority:** must
- **Source:** INV-AST-004 (1–5 refs), INV-AST-006 (org-scoped, project attachment), BR-AST-001/003
- **Statement:** Entities (company/product/person/character) live at org level with name, description, and 1–5 ready image refs; projects attach a cast; attached entities feed generation (text blocks for all kinds; ref images for frames). MVP: whole-project cast applies to every shot (per-shot selection follows — deviation logged).
- **Acceptance criteria:**
  - GIVEN 0 or >5 refs, or a non-ready/non-image ref THEN createEntity rejects (INV-AST-004/005).
  - GIVEN an attached cast WHEN a frame generates THEN its prompt contains each entity block and provenance refs include entity ref asset ids; provider receives their bytes as refImages.
  - GIVEN a take THEN entity text blocks appear (image refs for video follow with referenceImages arm).
- **Tests:** `tests/entities.int.spec.ts`, `../stb/tests/cast.int.spec.ts` + browser E2E · **Code:** `src/entities.ts`, migration 0008, `apps/web/app/library`, cast UI · **Log:** LOG 2026-07-23 (slice 3)

*(PROPOSED 005, 007–008: statements in `docs/12-asset-library.md`; elaborate when promoted.)*
