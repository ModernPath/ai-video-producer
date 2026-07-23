# Requirements Ledger — AST (Asset Library)

## Dashboard — AST (Asset Library)
Totals: 0 DONE · 3 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 5 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-AST-001 | Object storage put/get round-trip | P1 | IN_REVIEW | INV-AST-002 | tests/storage.int.spec.ts | src/storage.ts |
| REQ-AST-002 | Generated assets carry real validated bytes | P1 | IN_REVIEW | INV-AST-002 | tests/generated-bytes.int.spec.ts | ../gen/src/executor.ts, ../gen/src/fixtures.ts |
| REQ-AST-003 | Assets served to UI via streaming route | P1 | IN_REVIEW | `docs/12` §5 | browser E2E (LOG 2026-07-23) | apps/web/app/api/assets/[id]/route.ts |
| REQ-AST-004 | Upload sessions (presigned) with validation | P3 | PROPOSED | INV-AST-005 | — | — |
| REQ-AST-005 | Derivatives (thumb/poster) on ready | P2 | PROPOSED | BR-AST-002 | — | — |
| REQ-AST-006 | Entities org-scoped, 1–5 refs | P4 | PROPOSED | INV-AST-004/006 | — | — |
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

*(PROPOSED 004–008: statements in `docs/12-asset-library.md`; elaborate when promoted.)*
