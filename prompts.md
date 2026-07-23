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

Report: routing and next steps.
```

---

## Prompt E — Epic creation (V-model)

```
Read req-driven-dev/V-model-loop.md Epic Specification Gate and req-driven-dev/interview-flows.md Flow 2.

Topic: «e.g. Golden thread: direction → start frame → take → download clip»

Create epics/EPIC-«AREA»-NNN-«title».md (or folder layout) with sourced user outcome, bounded context, BDD scenarios, system requirements, tasks, failing-test strategy.
Add Epic Rollup and Work Rows to /WORKLIST.md when gate passes.
End with Implementation kickoff prompt (Flow 11) if READY rows exist.
```

---

## Tips

1. Run **0A** once per major product pivot; refine docs before large builds.
2. Seed **one context** with Prompt 1, build it, then seed the next.
3. Use **Prompt E** for cross-cutting user journeys; **Prompt 2** for ledger slices inside a context.
4. Keep slices to 2–3 requirements or one epic task row per agent run.
