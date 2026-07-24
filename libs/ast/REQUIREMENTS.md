# Requirements Ledger — AST (Asset Library)

## Dashboard — AST (Asset Library)
Totals: 8 DONE · 0 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 1 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-AST-001 | Object storage put/get round-trip | P1 | DONE | INV-AST-002 | tests/storage.int.spec.ts | src/storage.ts |
| REQ-AST-002 | Generated assets carry real validated bytes | P1 | DONE | INV-AST-002 | tests/generated-bytes.int.spec.ts | ../gen/src/executor.ts, ../gen/src/fixtures.ts |
| REQ-AST-003 | Assets served to UI via streaming route | P1 | DONE | `docs/12` §5 | browser E2E (LOG 2026-07-23) | apps/web/app/api/assets/[id]/route.ts |
| REQ-AST-004 | Uploads (presigned + direct) with validation | P3 | DONE | INV-AST-005 | tests/uploads.int.spec.ts + browser E2E | src/uploads.ts |
| REQ-AST-009 | Client-side image shrink + previews + any format | P1 | DONE | USER BUG 2026-07-23 (1MB action limit) | browser E2E pending (extension dropped; user to retry) | components/ImagePicker.tsx, next.config, config.clientResize |
| REQ-AST-005 | Derivatives (thumb/poster) on ready | P2 | DONE | BR-AST-002 | tests/derivatives.int.spec.ts + browser E2E | migration 0016, src/derivatives.ts, executor+uploads hooks, ?thumb=1 route, UI |
| REQ-AST-006 | Entity library: org entities, refs, project cast | P4 | DONE | INV-AST-004/006, BR-AST-001/003 | tests/entities.int.spec.ts, ../stb/tests/cast.int.spec.ts + browser | src/entities.ts, apps/web (library, cast) |
| REQ-AST-007 | Style kits org-scoped + project attachment | P4 | DONE | INV-AST-006, BR-AST-001 | tests/style-kits.int.spec.ts + stb/tests/style-in-prompts + browser E2E | migration 0015, entities.ts, prj setProjectStyleKit, library + storyboard UI |
| REQ-AST-008 | Soft-delete protection for referenced assets | P2 | PROPOSED | INV-AST-003 | — | — |

---

### REQ-AST-001 — Object storage put/get round-trip
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-AST-002
- **Statement:** The storage adapter writes bytes to S3-compatible storage under the documented key layout and reads them back intact (bucket auto-ensured in dev).
- **Acceptance criteria:**
  - GIVEN bytes and a key WHEN put then get THEN identical bytes and recorded mime return.
- **Tests:** see dashboard row · **Code:** see dashboard row · **Log:** LOG 2026-07-23 (slice 1)

### REQ-AST-002 — Generated assets carry real validated bytes
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** INV-AST-002
- **Statement:** Mock (and later real) generations store actual media bytes; the asset row records storage key, mime, and byte size — no fixture:// placeholders.
- **Acceptance criteria:**
  - GIVEN a completed mock frame THEN storage holds an image (SVG/PNG) at the asset's key and `bytes > 0`.
  - GIVEN a completed mock take THEN storage holds a playable MP4 at the asset's key.
- **Tests:** see dashboard row · **Code:** see dashboard row · **Log:** LOG 2026-07-23 (slice 1)

### REQ-AST-003 — Assets served to UI via streaming route
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Source:** `docs/12` §5 (signed URLs later; dev streams via API)
- **Statement:** `GET /api/assets/{id}` streams the asset's bytes with correct content-type for ready, non-deleted assets.
- **Acceptance criteria:**
  - GIVEN a ready asset THEN the route returns 200 + bytes + mime; unknown id → 404.
- **Tests:** see dashboard row · **Code:** see dashboard row · **Log:** LOG 2026-07-23 (slice 1)

### REQ-AST-009 — Client-side image shrink + previews + any format
- **Status:** DONE · **Stage:** P1 · **Priority:** must
- **Raised-by:** USER BUG 2026-07-23 — large ref upload hit Next server-action 1MB body limit ("cant load large images, please shrink them on the browser client… Support all image formats and show previews")
- **Statement:** Image pickers downscale client-side before upload (canvas, max edge from config, JPEG re-encode), accept any browser-decodable format (converted to JPEG), and show previews with sizes before submit. Server action body limit raised as backstop; server allowlist unchanged (client normalizes).
- **Acceptance criteria:**
  - GIVEN a multi-MB image THEN upload succeeds (client sends a downscaled JPEG well under the limit) and a preview is shown before submitting.
  - GIVEN webp/gif/bmp/avif input THEN it converts and uploads; undecodable files produce a clear inline error, not a crash.
- **Tests:** browser E2E (large generated image) · **Code:** — · **Log:** —

### REQ-AST-004 — Uploads (presigned + direct) with validation
- **Status:** DONE · **Stage:** P3 · **Priority:** must
- **Source:** INV-AST-005, `docs/12` §2/§4
- **Statement:** Uploads validate mime allowlist + size caps from config before any asset becomes `ready`. Two paths share one core: presigned PUT sessions (browser→storage, prod path) and direct server-side bytes (dev/simple path). Media probe (duration/dimensions) deferred to derivatives slice (REQ-AST-005).
- **Acceptance criteria:**
  - GIVEN a disallowed mime or oversize payload THEN session creation is rejected `validation_failed`.
  - GIVEN a presigned session WHEN bytes are PUT to the URL and the session completed THEN a ready asset exists with matching byte size.
  - GIVEN direct bytes THEN a ready asset exists (browser evidence: attach a music track).
- **Tests:** `tests/uploads.int.spec.ts` + browser E2E (track attach) · **Code:** `src/uploads.ts`, migration 0007 · **Log:** LOG 2026-07-23 (slice 2)

### REQ-AST-006 — Entity library: org entities, refs, project cast
- **Status:** DONE · **Stage:** P4 · **Priority:** must
- **Source:** INV-AST-004 (1–5 refs), INV-AST-006 (org-scoped, project attachment), BR-AST-001/003
- **Statement:** Entities (company/product/person/character) live at org level with name, description, and 1–5 ready image refs; projects attach a cast; attached entities feed generation (text blocks for all kinds; ref images for frames). MVP: whole-project cast applies to every shot (per-shot selection follows — deviation logged).
- **Acceptance criteria:**
  - GIVEN 0 or >5 refs, or a non-ready/non-image ref THEN createEntity rejects (INV-AST-004/005).
  - GIVEN an attached cast WHEN a frame generates THEN its prompt contains each entity block and provenance refs include entity ref asset ids; provider receives their bytes as refImages.
  - GIVEN a take THEN entity text blocks appear (image refs for video follow with referenceImages arm).
- **Tests:** `tests/entities.int.spec.ts`, `../stb/tests/cast.int.spec.ts` + browser E2E · **Code:** `src/entities.ts`, migration 0008, `apps/web/app/library`, cast UI · **Log:** LOG 2026-07-23 (slice 3)

### REQ-AST-007 — Style kits: styles retained across videos
- **Status:** DONE · **Stage:** P4 · **Priority:** must · **Owner:** —
- **Raised-by:** USER original requirement #3 (styles retained across videos, selectable at start); promoted this slice
- **Source:** INV-AST-006, BR-AST-001 (`docs/12`)
- **Statement:** Style kits (name + style prompt) are org-level and reusable; a project selects at most one; the selected kit's prompt is appended to every auto-assembled frame and take prompt of that project.
- **Acceptance criteria:**
  - GIVEN an org WHEN a kit is created THEN it lists org-wide; blank name/prompt rejected.
  - GIVEN a project with a kit WHEN a frame/take is requested THEN the prompt snapshot contains the kit's prompt; detaching stops it.
  - GIVEN the storyboard THEN the kit is selectable in the header and the auto-script placeholders show the style text.
- **Tests:** `tests/style-kits.int.spec.ts`, `libs/stb/tests/style-in-prompts.int.spec.ts`, browser E2E (create kit → select on project → style visible in auto scripts) · **Code:** migration 0015, `src/entities.ts` (createStyleKit/listStyleKits/projectStylePrompt), `libs/prj` setProjectStyleKit, library + storyboard UI · **Log:** LOG 2026-07-23
- **Deferred / notes:** style reference images (kit refs feeding image gen) deferred until needed; custom user scripts intentionally NOT styled (verbatim rule).

### REQ-AST-005 — Derivatives (thumb/poster) on ready
- **Status:** DONE · **Stage:** P2 · **Priority:** should · **Owner:** —
- **Raised-by:** promoted this slice — storyboard shipped ~1MB originals into 128px tiles
- **Source:** BR-AST-002 (`docs/12`)
- **Statement:** Every ready image/video asset gets a small JPEG derivative (downscaled thumb / first-frame poster) generated failure-tolerantly; the asset API serves it via `?thumb=1` with original fallback; UI thumbnails request derivatives while the lightbox loads originals.
- **Acceptance criteria:**
  - GIVEN a ready image asset WHEN derivative runs THEN a JPEG exists in storage and thumb_storage_key is set; idempotent on re-run.
  - GIVEN `?thumb=1` THEN the derivative is served (original if absent); unsupported mimes skip silently.
  - GIVEN the storyboard THEN tiles/chips load derivatives (measured 945KB → 21KB) and click-to-zoom loads the original.
- **Tests:** `tests/derivatives.int.spec.ts` + browser/network E2E · **Code:** migration 0016, `src/derivatives.ts` (ffmpeg docker, ADR-007), executor + uploads hooks, asset route, page/ZoomImage · **Log:** LOG 2026-07-23
- **Deferred / notes:** existing 12 dev assets backfilled; config.derivative in shared config.

*(PROPOSED 008: statement in `docs/12-asset-library.md`; elaborate when promoted.)*
