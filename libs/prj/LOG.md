# Build Log — PRJ (Projects)

## 2026-07-24 — BATCH SIGN-OFF: all IN_REVIEW → DONE (human-approved)
**Done:** USER approved the review queue verbatim: "approve all for now" (evidence: sign-off artifact + per-REQ tests/browser/real-API links in the ledger). All IN_REVIEW rows in this ledger moved to DONE atomically (dashboard row + detail block + Totals).
**Decisions:** approval is provisional ("for now") — regressions reopen the specific REQ, not the batch.
**Deferred / Discovered / Follow-ups:** none. **Gate:** ledger parse verified via scripts/progress.ts.

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

## 2026-07-23 — REQ-PRJ-003 + REQ-PRJ-004 test backfill (PROPOSED → READY → IN_REVIEW)
**Done:** Promoted both backfill rows to READY with acceptance criteria, then red-first. REQ-PRJ-003: `archiveProject`/`unarchiveProject` in `src/service.ts`; BR-PRJ-003 enforced at the GEN boundary — `enqueueGeneration` now reads project status via PRJ's `getProjectStatus` and throws `GenEnqueueError("project_archived")` before inserting any row (`tests/archive.int.spec.ts`, 3 tests, seen red then green). REQ-PRJ-004: `costMeterUsd(db, projectId)` sums `cost_usd` over succeeded+running generations only (INV-PRJ-004), extracted from the storyboard header's inline SQL (`tests/cost-meter.int.spec.ts`, 2 tests, red then green — excludes queued/failed/canceled, 0 for empty project).
**Decisions:** GEN reads project status through PRJ's exported `getProjectStatus` (cross-context service call, not a direct table read — docs/02 §4 single-writer preserved); `costMeterUsd` uses raw SQL over `gen.generation` as a sync read model, same precedent as `src/activity.ts` (docs/02 §5). New `GenEnqueueError` carries a `code` field mirroring `GenRetryError`. Archived-but-missing projects: guard only fires on an existing archived row; enqueue behavior for unknown projectIds is unchanged.
**Deferred:** wiring `apps/web/app/p/[id]/page.tsx` cost header to `costMeterUsd` → integrator (file out of scope for this slice); note the inline SQL there currently sums ALL statuses and diverges from INV-PRJ-004 until wired.
**Discovered:** BR-PRJ-003 also blocks exports for archived projects — not enforced in ASM's export path; routed to /BACKLOG.md.
**Follow-ups:** integrator to swap page.tsx inline cost SQL for `costMeterUsd`; consider an archive guard on export enqueue (see Discovered).
**Gate:** new specs 5/5 green; full suite green except the 2 pre-existing REQ-STB-016 red-baseline tests committed in b4eee04 for a parallel agent (fail identically without this slice — verified via stash).
