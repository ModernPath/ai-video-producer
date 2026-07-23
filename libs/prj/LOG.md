# Build Log — PRJ (Projects)

## 2026-07-23 — Context scaffolded (Prompt 0B)
**Done:** lib skeleton, empty ledger, build guide.
**Decisions:** contracts in `./contracts` (Zod canonical).
**Deferred:** ledger seeding → Prompt 1.
**Discovered:** —
**Follow-ups:** seed requirements from docs/11-projects.md.
**Gate:** n/a (no tests yet).

## 2026-07-23 — PRJ ledger seeded + REQ-PRJ-002 idempotent create (→ IN_REVIEW)
**Done:** ledger seeded (001 backfilled IN_REVIEW from golden-thread enabler evidence; 003/004 PROPOSED with honest "built ad hoc, needs test backfill" notes). REQ-PRJ-002 red-first: createProject service with (org, command_id) unique + onConflictDoNothing race safety; replay returns original id. Web create form carries a per-render commandId. Browser: double-click Create → exactly one project (DB: 1 row, 1 command id).
**Observed:** user-created projects in the dev DB ("Pasi testaa", "ModernPath Celebration") — the app is being used hands-on; welcome real-world traffic alongside the loop.
**Gate:** suite green; real ring 3/3 (cast-aware script sample logged).
