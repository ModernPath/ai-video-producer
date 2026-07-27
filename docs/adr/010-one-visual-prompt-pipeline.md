# ADR-010 — One visual prompt pipeline; custom text substitutes a stage

- **Status:** ACCEPTED · 2026-07-27
- **Supersedes:** the "guidelines only shape auto prompts" half of the v3 prompt rule (USER 2026-07-23)
- **Context ref:** `docs/88-architecture-review.md` §2 · REQ-GEN-032

## Context
Prompt assembly had two paths. `assembleTakePrompt` and `assembleFramePrompt` each opened with
`if (customPrompt) return …`, expressing an earlier decision that a user’s own text should be used
verbatim without the composed guidelines.

The shot planner authors a custom `imagePrompt` and `videoPrompt` for **every** shot. So the composed
branch — where the craft, safety and format rails were being maintained — never executed in a real
film. Rails added there were dead code in production.

Four user-visible defects came from this one shape: on-screen text rendered into a corridor take;
dialogue never reaching the video model; the Style Card look never applying; and a reference
director’s name reaching the image model. A fifth was found by the refactor itself — the project
**style kit had never applied to any planned shot at all**.

## Decision
One pipeline. A custom prompt substitutes the SUBJECT stage only:

```
[subject] → [look] → [rails] → [sound] → [format]
    ↑ customPrompt replaces this stage, and nothing else
```

Look, rails, sound and format append unconditionally. The verbatim guarantee stands — the author’s
words are used unrewritten, and appear first — but they no longer opt the prompt out of the rails.

## Alternatives considered
- **Keep two paths, duplicate the rails into both.** Rejected: the duplication is precisely what
  drifted; a rail added to one branch is the failure mode being fixed.
- **Append rails only when a flag is set.** Rejected: the flag would be set by the planner, i.e.
  always, so it is a bypass with extra steps.

## Consequences
- Easy: a rail cannot be added to a branch nobody takes. `prompt.ts` has no early return.
- Easy: golden files (`libs/gen/tests/__prompts__/`) make every prompt change a reviewable diff.
- Hard: **planner-authored prompts are now longer.** They carry the card look, continuity, style kit
  and rails. Prompt length has a cost with some providers; if it becomes a problem the fix is fewer
  rails, not a second path.
- Hard: format tails standardised on the composed wording — a deliberate, small behaviour change to
  live prompts.
