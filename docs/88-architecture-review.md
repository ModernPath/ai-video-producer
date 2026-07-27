# 88 — Architecture Review (2026-07-27)

> **USER 2026-07-27:** "I would like to now get your feedback on the process and quality of the code
> we produced. Please review the architecture and come up with ideas how it could have been better?"

A review of the codebase after the P8–P9 run (director briefs, casting, continuity chains). Written
against the code as it stands at commit `0daa236`, not from memory. Most of what follows criticises
decisions made while building it.

Refactors identified here are tracked as `PROPOSED` ledger rows — see §7.

---

## 1. The defining failure mode

**The test suite was green while the product was wrong.** Every defect reported during this run —
the brand logo in every scene, a title card rendered inside a corridor take, a shot showing another
shot's prompt, a sub-clip claiming a start frame it did not have, dialogue never reaching the video
model — passed CI at the moment it shipped.

That is not a gap in diligence. It is a gap in *what was asserted*. The suite tested the functions
that build prompts and never asserted the prompt. It tested that state was stored and never that the
screen told the truth about it. Sections 2–4 are the three structural reasons.

Evidence: 123 `Discovered:` entries across the seven context logs, nearly all found by running the
product rather than by a failing test.

---

## 2. Prompt assembly has two paths, and production only uses one

`libs/gen/src/prompt.ts` — both visual builders open with the same shape:

```ts
export function assembleTakePrompt(i: TakePromptInput): string {
  if (i.customPrompt?.trim()) {
    return `${i.customPrompt}\n${look}\n${BRAND_SAFETY}\n${format}`;   // ← production path
  }
  // …composed path: direction, camera, cast, style, dialogue, rails…  ← effectively dead
}
```

The shot planner authors an `imagePrompt` and `videoPrompt` for **every** shot, so `customPrompt` is
always set. The composed branch below it — where the craft direction and safety rails were being
carefully maintained — never executes in a real film.

Four user-visible defects trace directly to this shape:

| Symptom | Rail that existed, on the wrong branch |
|---|---|
| "gibberish texts in middle of video" | `NO_ON_SCREEN_TEXT` |
| video prompts describing speech without the words | `Spoken line: "…"` |
| style not held between shots | card look (also not passed at all) |
| reference director reaching the image model | reference scrub |

**Better shape.** One pipeline; the user's text replaces a *stage*, never the pipeline:

```
[subject] → [look] → [continuity] → [dialogue] → [rails] → [format]
    ↑ customPrompt substitutes here only
```

Rails append unconditionally at the end. Expressing "custom text is used verbatim" as an early
`return` turned a formatting decision into a policy decision: it silently opted custom prompts out
of brand safety, text suppression and format pinning. That was never intended.

---

## 3. Two files carry too much

| File | Lines | Share | Responsibilities |
|---|---:|---:|---|
| `apps/web/app/p/[id]/page.tsx` | 1,180 | **29% of `apps/web`** | rail, timeline, ~9 stage panels, 4 drawer panels, casting, continuity, exports, failures |
| `libs/stb/src/service.ts` | 1,136 | 42 exports | shots · takes · frames · plans · scripts · casting · continuity · chains · critique |

The bounded-context boundaries between libs held perfectly under pressure — adding an entity kind
touched five packages with no circular import. The same discipline was never applied *within* STB.

The practical cost showed up in editing: `page.tsx` was modified by anchored string replacement
around thirty times this session and broke twice — once splitting a JSX ternary, once landing an
insertion inside the wrong function. **A file that can only be edited by careful anchoring is a file
that is too large.** That is a legibility problem for humans too, not only for tooling.

STB should have split by aggregate at the first sign of growth: `shots.ts`, `takes.ts`, `plan.ts`,
`casting.ts`, `continuity.ts`, `critique.ts` — several of which now exist as separate modules
anyway, proving the seams were always there.

---

## 4. The test pyramid is inverted

```
59 integration specs   ·   25 unit specs   ·   1 web test
```

Integration tests dominate, they are the slow ones, and they are the ones that flake under machine
load. Meanwhile the two layers that would have caught the real defects barely exist.

### 4a. Missing: artifact tests

Nothing asserts **what the model actually receives**. The fix is cheap:

```ts
expect(assembleTakePrompt(dinerShot)).toMatchFileSnapshot("__prompts__/diner-take.txt");
```

A committed golden file makes every prompt change a reviewable diff. The typography leak, the
missing dialogue clause and the whole-cast reference bloat would each have appeared as an obvious
diff the moment they were introduced — because the thing under test would be the output, not the
existence of the code that produces it.

### 4b. Missing: a render harness

`apps/web` has one test, and it is a source-text assertion written defensively. Three reported
defects were pure UI state:

- the stage reused one shot's uncontrolled prompt boxes for another (and *saved* the wrong text)
- a sub-clip offered a frame picker that would break its own chain
- a panel claimed a start frame came from the previous take when it did not

None is reachable without rendering. A component-render setup would have paid for itself twice in a
single session.

---

## 5. Correctness hazards the type system did not catch

| Hazard | What happened | Fix |
|---|---|---|
| Duplicate object key | `config.project` was declared twice; the later literal won and every threshold read `undefined` | `no-dupe-keys` lint |
| Vocabulary copied | `casting.ts` kept its own `["company","product","person","character"]`; adding `location` silently produced `character` | derive from the `as const` in config, type against it |
| Structurally-typed payload | `getObject` returns `{ bytes, mime }`; passing the whole object to ffmpeg produced nothing, silently | a `getBytes` helper, or a branded type |
| Globals in tests | `reapStaleGenerations` and `runNextGeneration` act across all projects, so parallel spec files reaped each other's fixtures | project-scope the sweep — which was also the correct semantics |

The last one is worth generalising: **test pain was pointing at a real design flaw**, and the first
instinct (mine) was to treat it as a test problem. A page load has no business failing another
project's running work, and scoping it fixed both.

---

## 6. Process observations

**The ledger drifted from instrument to ritual.** Current state: `48 IN_REVIEW · 0 signed off`.
`IN_REVIEW` now means "finished", which is what `DONE` was for, so the distinction carries no
information. Either drain the queue in batches or collapse the state — a status nobody acts on is
overhead with the appearance of rigour.

**The Definition of Done has no "look at it" gate.** §9 requires passing tagged tests, enforced
invariants, architecture checks, contract tests, sign-off, ledger hygiene and the real-API ring. It
does not require inspecting the output. That is exactly the gap the user filled by hand, repeatedly.

> Proposed addition to §9: *a user-visible requirement is not `DONE` until its produced artifact —
> prompt, image, take, or screen — has been inspected in the running product, and the observation
> recorded in the LOG.*

Everything else in §6/§9 worked. Red-first was followed without exception and repeatedly earned its
keep: the slot-collision on shot reorder, the position-preserving renumber, and the plan-normalizer
idempotence bug were all caught by a test written before the code.

---

## 7. Recommended refactors, in order

| # | Change | Why first | Tracked as |
|---|---|---|---|
| 1 | **Unify the prompt pipeline**; golden-file tests on assembled output | Retires an entire class of defect and makes prompt changes reviewable | `REQ-GEN-032` |
| 2 | **Split `stb/service.ts` by aggregate** | Unblocks safe editing of the largest module | `REQ-STB-059` |
| 3 | **Decompose `p/[id]/page.tsx`** into panel components | Same, for the file that broke twice under edit | `REQ-STB-060` |
| 4 | **Render harness for `apps/web`** + tests for the three UI defects | Closes the layer with zero coverage and three known escapes | `REQ-STB-061` |
| 5 | **Lint + config hardening**: `no-dupe-keys`, derive vocabularies, no literal copies | Cheap; each item already cost real debugging time | `REQ-GEN-033` |

None requires new product decisions; all are contained; none changes behaviour.

---

## 8. What worked, and should be preserved

- **The pure core is the best code here.** `timeline.ts`, `grammar.ts`, `chain.ts`, `casting.ts`,
  `preview.ts`, `plan-normalize.ts` are small, total, dependency-free and thoroughly tested. Every
  one was written red-first and not one has needed a bug fix.
- **Config as single source.** No model id or threshold literal exists outside `@avd/shared/config`.
  The Veo→Omni route switch and three price corrections were one-line changes.
- **Bounded contexts held.** Adding a new entity kind touched shared, ast, stb, gen and web without
  a circular import or a shared mutable.
- **Contracts are canonical.** The Zod Style Card caught six seed cards missing a required axis at
  compile time, the moment the axis was added.
- **The LOG is a genuine asset.** 123 recorded discoveries with reasoning and evidence — the reason
  this review could be written from the record rather than from memory.
