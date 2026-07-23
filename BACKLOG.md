# BACKLOG — Triage Inbox

Discoveries without a clear home yet (`CLAUDE.md` §6A). Sweep during Prompt 3: route to a context `REQUIREMENTS.md`, `docs/08-open-questions.md`, `docs/gap-register.md`, an epic under `epics/`, or drop with reason.

> **Inbox status:** 1 item

## Inbox

| Discovery | Tracked as |
|---|---|
| Image-gen price table: `standard`/`hero` rates are placeholders in `libs/shared/src/config/models.ts` — verify against Google pricing page before enabling real-API cost caps | — (route to REQ-GEN-* when GEN ledger is seeded) |

---

## Routing Log

## 2026-07-23 — Build loop iteration 1: Prompt 0B complete

**Done:** git repo (`main`), pnpm workspace, 6 context libs (ledger+log+guide each), `@avd/shared` config (model routes, price table, provider limits — no-literals rule), docker-compose (pg 16 + minio, both up), migrator + `0001_init.sql` (plt.organization, prj.project), vitest harness. **Gate: 5/5 tests green** incl. vertical org→project→query integration test.
**Next iteration:** Prompt 1 — seed GEN + STB ledgers (golden-thread order per `docs/81` Phase 1); then `apps/web` Next.js scaffold so browser testing can start.

## 2026-07-23 — Product re-spec (docs v1.0)

**Done:** `docs/` rewritten from generic-NLE template to the shot-based **AI Video Director** spec (originals in `docs/_archive/v0-template/`). Contexts now PLT, PRJ, STB, GEN, AST, ASM. New OQ-101…111, GAP-101…110, ADR-001…008.

**Next (Prompt 0B / 1):**
- Bootstrap harness per `82-tech-stack.md` (Prompt 0B).
- Seed ledgers in order: GEN → STB → AST → ASM → PRJ → PLT (golden thread first, `81-build-plan.md` Phase 1).
- Phase 1 includes API spikes to close OQ-101 (end-frame conditioning), OQ-102 (output resolution), OQ-104 (duration precision).

## 2026-07-23 — User additions: reusable entities, AI-editable refs, retained styles, everything revisable

**Routed (docs updated):**
- Org-level **Entities** (company/product/person/character) with refs, attached at project setup → `12-asset-library.md`, `40`, `07`, `features/library-style.md` (closes GAP-102)
- **AI image editing** of any image (refs, frame candidates) → GEN kind `image_edit` (BR-GEN-006, BR-AST-005), `POST /assets/{id}/edit`, Edit Studio UI
- **Style Kits org-scoped** → INV-AST-006, project attachment tables
- **Everything revisable/removable** → overview non-negotiable 5, POL-STB-003, `RemoveCandidate` + soft-delete rules (INV-AST-003)

### Template Entry

```markdown
## YYYY-MM-DD — Triage pass N
**Routed:**
- Item → REQ-TML-NNN (PROPOSED)
- Item → docs/08-open-questions.md OQ-NNN
- Item → DROPPED (reason)

**Promoted PROPOSED → READY:**
- REQ-TML-NNN

**Notes:** …
```

## 2026-07-23 — Build loop iteration 4
**Done:** STB ledger seeded + slice 1 (REQ-STB-001..004 IN_REVIEW); web UI golden thread browser-verified (create project → shot → frame → take → selections; mock $0 cost).
**Inbox additions:** (1) extract dev-inline queue drain into apps/worker with pg-boss (owner: GEN/ASM enabler). (2) red-first discipline slipped in STB slice — process learning noted in STB LOG.
**Next:** ASM slice (snapshot + concat stub) or AST storage so tiles render real fixture bytes; then reorder + PROGRESS.md refresh.

## 2026-07-23 — Build loop iteration 5
**Done:** AST ledger seeded + slice 1 (storage adapter, real fixture bytes, asset serving) — red-first honored; browser-verified image + playable video. Executor org-scoping fixes parallel-test race.
**Next:** ASM slice — storyboard snapshot + ffmpeg concat in dockerized step → downloadable export; then PROGRESS.md refresh + review queue (13 REQs IN_REVIEW).

## 2026-07-23 — Build loop iteration 6
**Done:** ASM ledger + slice 1 — full idea-to-file golden thread now works in browser: shot → frame → take → select → Export cut → download final.mp4 (validated ISO MP4). Test-hygiene bug found & fixed (unscoped afterAll wiped shared dev DB).
**Learning:** shared dev DB + parallel int tests keep biting — consider per-suite schema or testcontainers (inbox item).
**Inbox additions:** per-suite DB isolation for integration tests; export needs multi-shot browser validation next round (concat of ≥2 clips verified in tests only so far).
**Next:** PROGRESS.md rollup + review queue (16 REQs IN_REVIEW); then either apps/worker extraction or script studio (gemini-3.6-flash draft → shot plan) to make the product feel AI-native.
