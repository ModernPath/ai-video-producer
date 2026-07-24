# Execution Prompts — AI Video Producer

Copy-paste prompts for the process in `CLAUDE.md`. Replace `«PLACEHOLDERS»` with project-specific values.

**Target product:** AI Video Director (script → shot storyboard → generated frames/takes → assembly/export).

**Context codes:** PLT, PRJ, STB, GEN, AST, ASM — see `docs/02-bounded-contexts.md`.

---

## Deviation & status discipline

See `CLAUDE.md` §5 and §6A: every deferral becomes a requirement row; status changes update dashboard row, detail block, and `Totals:` atomically.

---

## Prompt 0A — Discovery: Intent → Design docs

```
Read /CLAUDE.md §2 and §4. Product: AI-native video editor / producer.

**Input:**
- Vision, user stories, constraints: «paste customer/product input»
- Tech stack: «e.g. TypeScript, React, Node, Postgres, object storage, ffmpeg, LLM provider»
- Deployment: «local / cloud / hybrid»

**Output:** Populate or refresh docs/ per docs/00-overview.md document map:
- 00-overview.md (thesis, capabilities, conventions, glossary seed)
- 01-ubiquitous-language.md
- 02-bounded-contexts.md
- 03-platform-architecture.md
- 06-ux-architecture.md + docs/features/* for major surfaces
- 07-api-contracts.md (conventions + resource outline)
- 10–17 domain docs for PLT, PRJ, AST, STB, GEN, ASM as needed
- data/40-data-model.md, data/41-event-catalog.md
- 82-tech-stack.md, 08-open-questions.md, gap-register.md

Rules: extract explicit rules as INV-/BR-; flag ambiguities as OQ-; use video domain language (Project, Sequence, Clip, Asset, RenderJob, etc.).

Report: contexts, rule counts, open questions, suggested MVP slice order.
```

---

## Prompt 0B — Bootstrap harness

```
Read /CLAUDE.md and docs/82-tech-stack.md.

Stand up skeleton ONLY — no product features:
- Monorepo: libs/ per context from docs/02, apps/ for editor-web, api, render-worker (names TBD)
- Local dev (Docker Compose or equivalent): Postgres, object storage stub, optional queue
- Schema-first wiring, migrations, test harness (unit + integration + contract)
- CI: tests block merge
- Per-context libs/<ctx>/CLAUDE.md from CLAUDE.md §10 template

Exit: trivial vertical test (create tenant/project → persist → query). Report commands and layout.
```

---

## Prompt 1 — Seed one context ledger

```
Read /CLAUDE.md §4–5. Target context: «STB» (or PLT, PRJ, GEN, AST, ASM).
Read docs/«13-storyboard».md (or matching domain doc), docs/02, data/40/41.

Derive libs/«stb»/REQUIREMENTS.md: one REQ per invariant, rule, command, event, key query.
Status READY when acceptance criteria are unambiguous; else PROPOSED or BLOCKED + OQ.
Create LOG.md initial entry and libs/«stb»/CLAUDE.md from template.

Do NOT implement product code.
Report: counts, requirement list, new OQs.
```

---

## Prompt 2 — Build loop (repeat)

```
Read /CLAUDE.md §1, §6, §9. Context: «STB». Open REQUIREMENTS.md and LOG.md tail.

Run the build loop on up to «3» READY requirements (or promote PROPOSED → READY first).

Follow RED → GREEN → GATE → TRACE → LOG; capture discoveries to BACKLOG or PROPOSED rows.
Verify status hygiene on Totals vs detail blocks.

GATE additions (learned 2026-07-23):
- ALWAYS run `npx tsc -p apps/web/tsconfig.json --noEmit` — vitest transpiles without
  typechecking; scripted str.replace edits no-op silently on anchor drift (two prod misses).
- Provider-facing changes: real-model verification per the cost tiers below.
- User-visible changes: browser-verify with a FRESH navigation (dev-server restarts kill
  open pages' submits silently); when extension clicks drop, drive the chain server-side
  via tsx and confirm the RESULT in the browser + DB.

Real-cost tiers (verify at the cheapest honest level):
  free — text gens, Remotion renders, exports, transcript-of-attached, plan/apply
  cents — frames $0.067 · Lyria song $0.08 · frame-batch click $0.13
  tenths — Veo take $0.10/s (snap {4,6,8}s) — one per slice max, respect the daily cap

Report: completed/blocked/deferred, discoveries, next READY, PROGRESS refresh hint.
```

---

## Prompt 3 — Triage & replan

```
Read /CLAUDE.md §6A. Scope: «all contexts» or «STB».

Sweep /BACKLOG.md → route to ledgers, 08-open-questions.md, gap-register.md, or drop.
Reconcile doc changes → new PROPOSED / OBSOLETE requirements.
Promote next slice PROPOSED → READY where criteria are clear.

Append LOG entries; refresh PROGRESS.md.
Report: routing, new READY queue, OQs.
```

---

## Prompt 4 — Feedback integration

```
Read /CLAUDE.md §6A.

**Input:** «user feedback, bug, feature request»

Route: bug → fix REQ in owning context; feature → PROPOSED or OQ; design change → list affected docs and reqs for human decision.
Epic-scale user directives get a canonical doc first (pattern: docs/85 prompt-guidelines,
docs/87 directing-playbook), THEN REQ rows referencing it.

Report: routing and next steps.
```

---

## Prompt 5 — Archetype eval (taste loop, docs/87)

```
Read docs/87-directing-playbook.md. Archetype: «hype-countdown».

Run one REAL golden path on a fresh project (give it a REAL-sounding title — project titles leak into prompts and 'EVAL …' names contaminate the creative output): archetype set → script → plan → cheapest
honest visuals (1 frame per filmed shot, free animation shots, ONE take on the money shot)
→ Lyria (retry once on policy block after regenerating the brief) → transcript → export.

Extract frames at the structural beats and REVIEW against the six directing principles —
name every defect, fix what's fixable in-slice (template scaling, prompt guidelines),
defer the rest with cost noted. Archive the eval project after.

Report: principle-by-principle verdict, defects found/fixed/deferred, total spend.
```

---

## Prompt E — Epic creation (V-model, CLAUDE.md §5B)

```
Read CLAUDE.md §5B (trace chain, statuses, Epic Specification Gate).

Topic: «e.g. Golden thread: direction → start frame → take → download clip»

1. INTERVIEW first: confirm the topic isn't already owned by an existing epic; elicit the
   user outcome, actors, linked user requirements, and the initial workflow — record every
   claim with a source ref (USER:/DOC:/CODE:), unsourced claims become open questions.
2. Create epics/EPIC-«AREA»-NNN-«title».md per §5B: sourced outcome, bounded context(s),
   BDD scenarios (sourced Given/When/Then), system requirements, tasks, failing-test
   strategy for both loops.
3. When the Specification Gate passes, add the Epic Rollup row + Work Rows to /WORKLIST.md.
4. If READY rows exist, end with an implementation kickoff prompt specific enough that a
   fresh session can start without re-interviewing (scoped strictly to the assigned rows).
   For a PROPOSED/BLOCKED epic, instead list the missing gate items and needed sources.
```

---

## Tips

1. Run **0A** once per major product pivot; refine docs before large builds.
2. Seed **one context** with Prompt 1, build it, then seed the next.
3. Use **Prompt E** for cross-cutting user journeys; **Prompt 2** for ledger slices inside a context.
4. Keep slices to 2–3 requirements or one epic task row per agent run.
5. Config-not-code for anything a human will want to tune (prices, recipes, styles,
   effect defaults) — taste iteration must never need a code review.
6. When a provider misbehaves (policy blocks, shape drift), the fix is usually a PROMPT
   guideline (docs/85) plus an error-surface improvement — not a retry loop.
7. Evidence beats assertion: frame extractions for visual claims, DB queries for state
   claims, prompt snapshots for "the model was told X" claims.
