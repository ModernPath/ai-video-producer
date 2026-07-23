# Requirements Ledger — PLT (Platform & Identity)

## Dashboard — PLT (Platform & Identity)
Totals: 0 DONE · 1 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 0 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-PLT-001 | Deterministic dev-org resolution (by configured name) | MVP | IN_REVIEW | USER BUG 2026-07-23 (entities landed in test orgs) | browser E2E (library + cast bar) | apps/web devOrgId, config.platform.devOrgName |

### REQ-PLT-001 — Deterministic dev-org resolution
- **Status:** IN_REVIEW · **Stage:** MVP · **Priority:** must · **Owner:** —
- **Raised-by:** USER BUG 2026-07-23: "Why can I only select characters, not persons or products?" — `select … limit 1` with no order returned an arbitrary org once test orgs existed, so new entities landed in a test org invisible to the user's projects.
- **Source:** `docs/10-platform-identity.md` (single-tenant dev mode)
- **Statement:** All web-app organization resolution shall go through one helper that resolves by the configured dev-org name (`config.platform.devOrgName`), creating it if missing; no `limit 1` without a deterministic predicate.
- **Acceptance criteria:**
  - GIVEN extra orgs in the DB WHEN any page/action resolves the org THEN it is always the configured dev org.
  - GIVEN no org WHEN resolved THEN the dev org is created once (name from config, not a literal).
- **Tests:** browser E2E (library create → cast bar shows entity) · **Code:** `apps/web/app/actions.ts` (devOrgId), `apps/web/app/library/page.tsx`, `libs/shared/src/config/limits.ts` · **Log:** LOG 2026-07-23
- **Deferred / notes:** data repaired (Pasi → Local Studio; 10 test orgs purged). Real fix for pollution = dedicated test DB → BACKLOG.

*(Seed via Prompt 1 from `docs/10-platform-identity.md`.)*
