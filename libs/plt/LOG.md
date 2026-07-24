# Build Log — PLT (Platform & Identity)

## 2026-07-24 — BATCH SIGN-OFF: all IN_REVIEW → DONE (human-approved)
**Done:** USER approved the review queue verbatim: "approve all for now" (evidence: sign-off artifact + per-REQ tests/browser/real-API links in the ledger). All IN_REVIEW rows in this ledger moved to DONE atomically (dashboard row + detail block + Totals).
**Decisions:** approval is provisional ("for now") — regressions reopen the specific REQ, not the batch.
**Deferred / Discovered / Follow-ups:** none. **Gate:** ledger parse verified via scripts/progress.ts.

## 2026-07-23 — REQ-PLT-001 deterministic dev-org resolution (→ IN_REVIEW)
**Done:** devOrgId resolves by config.platform.devOrgName (was `limit 1`, order undefined); library page + entity actions all route through it. Data repair: moved user's "Pasi" person entity to Local Studio; purged 10 test orgs + dependents from dev DB.
**Decisions:** dev-org name lives in shared config (no literals rule).
**Deferred:** —
**Discovered:** interrupted test runs leave org debris even with teardown → dedicated test DB (BACKLOG).
**Follow-ups:** browser-verify cast bar shows person + character.
**Gate:** stb remove-shot suite green with new teardown; org table clean (only Local Studio).

## 2026-07-23 — Context scaffolded (Prompt 0B)
**Done:** lib skeleton, empty ledger, build guide.
**Decisions:** contracts in `./contracts` (Zod canonical).
**Deferred:** ledger seeding → Prompt 1.
**Discovered:** —
**Follow-ups:** seed requirements from docs/10-platform-identity.md.
**Gate:** n/a (no tests yet).
