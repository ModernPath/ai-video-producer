# Build Log — AST (Asset Library)

## 2026-07-28 — REQ-PLT-003: ffmpeg call sites moved to the shared runner (ADR-014)
**Done:** The three call sites here (thumbnail derivatives, duration probe, tail-frame extraction) switched from `docker run jrottenberg/ffmpeg` to `@avd/shared/ffmpeg`. Arguments are unchanged — they still reference files as `/work/<name>`; the runner bind-mounts on a laptop and rewrites `/work` to the real path against the baked-in binary in the deployed image (`FFMPEG_MODE=native`).
**Decisions:** the mode is configuration, not a branch at the call site (CLAUDE.md §1.10). No call site knows which mode it is in.
**Deferred:** —
**Discovered:** this code could never have worked in the container — there is no docker socket — and it would have failed SILENTLY, because each of these three catches and returns null/warns by design, so a thumbnail, a track duration and a continuity start-frame would all have gone quietly missing.
**Follow-ups:** covered by REQ-PLT-003 in `libs/plt/REQUIREMENTS.md`.
**Gate:** `pnpm typecheck` clean; 375 unit tests green; golden argv spec `libs/shared/tests/ffmpeg.spec.ts`.


## 2026-07-27 — human sign-off: 4 requirements IN_REVIEW → DONE
**Done:** USER:2026-07-27 "Let's approve all requirements in review state?" — the 4 IN_REVIEW rows in this ledger are approved and moved to DONE. Covers uploads, entities, style kits and reference-image editing. Status updated in all three places per `CLAUDE.md` §1.8 (dashboard row · detail block · `Totals:`); `PROGRESS.md` regenerated from the ledgers and independently agrees (129 DONE · 0 IN_REVIEW across all contexts).
**Decisions:** this drains the queue rather than collapsing the state — the option `docs/88-architecture-review.md` §6 offered when it recorded "48 IN_REVIEW · 0 signed off" and called the distinction information-free. IN_REVIEW keeps its meaning for future work; it is the sign-off that was outstanding, and the user is the sign-off authority. Checked before flipping: every row carries both a Tests and a Code link, and no detail block flags open work.
**Deferred:** none.
**Discovered:** with this drained, the whole repo holds 0 READY and 0 IN_PROGRESS — the actionable queue is empty. What remains is 4 PROPOSED (the architecture-review refactors) and 1 BLOCKED (REQ-STB-032 on OQ-115). Per `CLAUDE.md` §13 an empty queue is itself a review trigger.
**Follow-ups:** promote the PROPOSED refactors when the next build session starts.
**Gate:** ledger-only change, no code touched. Verified 0 residual IN_REVIEW in any ledger; row count matched detail-block count in every file before the flip (mismatch would have aborted).

## 2026-07-24 — BATCH SIGN-OFF: all IN_REVIEW → DONE (human-approved)
**Done:** USER approved the review queue verbatim: "approve all for now" (evidence: sign-off artifact + per-REQ tests/browser/real-API links in the ledger). All IN_REVIEW rows in this ledger moved to DONE atomically (dashboard row + detail block + Totals).
**Decisions:** approval is provisional ("for now") — regressions reopen the specific REQ, not the batch.
**Deferred / Discovered / Follow-ups:** none. **Gate:** ledger parse verified via scripts/progress.ts.

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

## 2026-07-24 — Entity-ref anchor VALIDATED (post-decision check)
**Done:** USER's entity fixes (kind=product, dragon-frame ref, de-tainted description) validated with 2 fresh hero-shot frame candidates ($0.13): both independently reproduce the exact ref design — same circular kaiju-dragon emblem, same custom KAIJU lettering, matte green 330ml. Design consistency across generations is now anchored; contrast with the pre-fix era where every shot invented its own can (incl. a competitor's mark).
**Decisions:** the two new candidates left unselected on Hero Climax Drop (the selected dragon frame + take stand).
**Deferred:** — **Discovered:** browser submit-drop hit twice despite fresh navigation (no POST in dev log = client-side flake, not app bug); driver gained a `frames <projectId> <shotTitle> [count]` stage as the reliable fallback — memory updated.
**Follow-ups:** — **Gate:** both gens succeeded at $0.067; spend today ≈ $12.0 / $100.

## 2026-07-24 — REQ-AST-010 entity deletion (→ IN_REVIEW) — USER request with screenshot
**Done:** "please allow me deleting assets" → per-ref ✕ (works on dangling ids — no validation, that IS the cleanup case) + "✕ archive" per entity (soft; leaves library AND project casts via new listProjectEntities filter). Red-first int tests 2/2; browser-verified end-to-end: clicking ✕ on Pasi's broken ref removed it through the real UI (DB: refAssetIds={}), card now shows the "no refs — designs will drift" hint. Assets never deleted (INV-AST-003).
**Decisions:** removal over destruction everywhere; last-ref removal allowed with an honest drift warning.
**Deferred:** add-ref to existing entity (Pasi needs a photo re-upload — currently ref-less); unarchive UI.
**Discovered:** transient "action not defined" browser error during hot-reload mid-edit — stale chunk, gone on fresh load.
**Follow-ups:** user uploads a Pasi photo (new entity or wait for add-ref). **Gate:** full suite green, tsc clean.

## 2026-07-24 — REQ-AST-011 add refs to an existing entity (→ IN_REVIEW)
**Done:** the REQ-AST-010 deferral closed same-day: `addEntityRefs` appends uploaded ready images under the INV-AST-004 cap (combined count), red-first 2/2 incl. the full remove-to-zero→add-back round trip; "＋ Add refs" control on every card below the cap (hidden at 5), browser-verified on the ref-less Pasi card; stale "add one via a new entity" hint corrected to point at the control.
**Decisions:** cap validates the COMBINED set; upload path reuses uploadBytesDirect (client-shrunk like entity creation).
**Deferred:** — **Discovered:** — **Follow-ups:** Pasi's actual photo upload is the user's move.
**Gate:** full suite green, tsc clean.

## 2026-07-24 — Triage: REQ-AST-008 → OBSOLETE
**Done:** delete-protection marked OBSOLETE — there is no hard-delete path to protect; INV-AST-003 is enforced structurally (reference removal + soft archive only, REQ-AST-010/STB-009). Superseding refs recorded in all 3 ledger places.
**Decisions/Deferred/Discovered/Follow-ups:** none. **Gate:** ledger parse via progress.ts (below).

## 2026-07-24 — REQ-AST-012 + REQ-GEN-024: brand profiles, web-grounded (→ IN_REVIEW)
**Done:** USER feature shipped end-to-end: entities gain a long-form `profile` (migration 0022) that feeds script/plan/music prompts as a capped BACKGROUND block (red-first: text prompts carry it, visual prompts never do — the short description keeps that job); library company/product cards offer the textarea + "✦ Research from web" which grounds generation on Google Search + the given URL (gemini tools googleSearch/urlContext per the linked docs). Real verification on the user's own company: LastBot + lastbot.com returned an accurate profile (LastBot ONE, Switchbot, GDPR/SME positioning). Browser-verified: profile section renders on product cards, absent on person cards.
**Decisions:** profile is text-prompt-only by design (visual prompts stay lean); research is a direct near-free helper, no generation ledger row (transcribe pattern); person/character bios deferred until a use case.
**Deferred:** grounding citations not persisted. **Discovered:** — **Follow-ups:** user: hit ✦ Research on a company entity and review the saved profile.
**Gate:** full suite + tsc green; real research verified.
