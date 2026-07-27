# Build Log — PRJ (Projects)

## 2026-07-27 — human sign-off: 2 requirements IN_REVIEW → DONE
**Done:** USER:2026-07-27 "Let's approve all requirements in review state?" — the 2 IN_REVIEW rows in this ledger are approved and moved to DONE. Covers style cards on the project and the cost meter. Status updated in all three places per `CLAUDE.md` §1.8 (dashboard row · detail block · `Totals:`); `PROGRESS.md` regenerated from the ledgers and independently agrees (129 DONE · 0 IN_REVIEW across all contexts).
**Decisions:** this drains the queue rather than collapsing the state — the option `docs/88-architecture-review.md` §6 offered when it recorded "48 IN_REVIEW · 0 signed off" and called the distinction information-free. IN_REVIEW keeps its meaning for future work; it is the sign-off that was outstanding, and the user is the sign-off authority. Checked before flipping: every row carries both a Tests and a Code link, and no detail block flags open work.
**Deferred:** none.
**Discovered:** with this drained, the whole repo holds 0 READY and 0 IN_PROGRESS — the actionable queue is empty. What remains is 4 PROPOSED (the architecture-review refactors) and 1 BLOCKED (REQ-STB-032 on OQ-115). Per `CLAUDE.md` §13 an empty queue is itself a review trigger.
**Follow-ups:** promote the PROPOSED refactors when the next build session starts.
**Gate:** ledger-only change, no code touched. Verified 0 residual IN_REVIEW in any ledger; row count matched detail-block count in every file before the flip (mismatch would have aborted).

## 2026-07-26 — REQ-PRJ-005 fix: freeform no longer destroys a compiled card
**Done:** `setProjectArchetype` nulled `styleCard` on every write, including the null/"freeform" case. Combined with a picker that displays "freeform" whenever a compiled card is active, one press of Set silently deleted the user's compiled card — which is exactly what happened to them mid-session.
**Decisions:** only choosing a REAL archetype replaces a compiled card; freeform leaves it alone. The one-active-style-source rule stands, but a destructive default reachable from a control that misrepresents the current state is a trap, not a rule. The picker now names the compiled card.
**Gate:** new red-first case in `tests/style-card-store.int.spec.ts`; 29/29 in `libs/prj`; tsc clean.


## 2026-07-26 — REQ-PRJ-006 film runtime (→ IN_REVIEW)
**Done:** USER: "it's only 30seconds instead of minute that I was asking for." Two independent causes, both fixed: `parseRequestedDurationS` reads a runtime out of the user's own prompt when a card is compiled, and the runtime is now editable in the workspace — it had been displayed in the header and settable nowhere since project creation.
**Decisions:** the parser stays conservative and returns null on any doubt: out-of-range values are treated as "not a runtime" rather than clamped, because silently re-timing someone's film on a loose match ("shot on 16mm") is worse than not reading it. Clamping happens only in `setProjectTargetDuration`, where the user has explicitly asked for a number.
**Discovered:** adding `config.project` created a DUPLICATE key — `config` already had a `project` block further down, and the later literal silently won, so every threshold read as `undefined` and the parser returned null for everything. The unit tests caught it immediately; merged into the existing block. Also: the user's saved prompt is "ModernPath short film in the style of Aki Kaurismäri" — no runtime in it at all — so the parser is right to return null there and the editable field is what actually fixes their case. Worth stating plainly rather than claiming the parser solved it.
**Follow-ups:** changing the runtime does not re-plan existing shots; it guides the next shot plan.
**Gate:** 8/8 `tests/brief-duration.spec.ts`, 28/28 across `libs/prj`; tsc clean. Live: set the user's project to 60s from the new field and confirmed `target_duration_s = 60.0` in Postgres.


## 2026-07-26 — REQ-PRJ-005 compiled Style Card on the project (SR-DIR-008 → IN_REVIEW)
**Done:** USER asked how to test their Kaurismäki short film and found the directing picker offered only the six built-ins. Added `prj.project.style_card` (migration 0023), `setProjectStyleCard`/`getProjectStyleCard`, a `compileStyleCardAction` behind a "✦ Direct from my prompt · free" button under the picker, and a card panel showing what was compiled — camera, pacing, palette swatches, humour, refusals, and the researched references labelled as never sent to an image model.
**Decisions:** (1) Exactly one style source: storing a compiled card nulls `archetype`, and choosing a built-in nulls the card. Two answers to "what does this film look like?" would leave `recipeFor` arbitrating, which is a bug waiting to happen. (2) The card is validated by `styleCardSchema` on write — an invalid card must never reach the prompt builders, which assume the contract holds. (3) `getProjectStyleCard` returns null rather than throwing when a stored card fails to parse, so a future contract change degrades to "no card" instead of breaking the whole project page. (4) Compiling stays off the generation ledger, matching the `research.ts` precedent for single near-free text calls.
**Deferred:** axis-by-axis editing of a compiled card (UR-DIR-002) — recompiling replaces it for now.
**Discovered:** `setArchetypeAction` was still revalidating `/p/<id>/script`, a route that has only redirected since REQ-STB-037 — so the picker's own change never invalidated the page it renders on. Fixed while here.
**Follow-ups:** card editing; execute-and-apply the director's revision; surface notes in the UI.
**Gate:** 9/9 `tests/style-card-store.int.spec.ts` (red first); 140/140 across the epic's specs; tsc clean. Verified live in the browser on the user's own project: "ModernPath short film in the style of Aki Kaurismäri" compiled in ~25s to "Static Retro Deadpan" — static/pan only, 5–9s, #c82323 on #2d3a45, five refusals — and it researched Kaurismäki, his cinematographer Timo Salminen and four films DESPITE the misspelled name. Drafting the script from it produced locked-off symmetrical framing, slate-teal walls, a crimson mug, hard tungsten key and a diegetic tango; the shot plan came back WS/MS/MCU/MW/CU/WS at 6s, and the director's pass graded it "The plan honours the style."


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
