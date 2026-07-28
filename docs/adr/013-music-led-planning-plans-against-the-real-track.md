# ADR-013 — For music-led films, the shot plan is made against the real track, not before it

- **Status:** ACCEPTED · 2026-07-28
- **Context ref:** OQ-115 (resolved by this ADR) · REQ-STB-032 · REQ-STB-028 · REQ-GEN-020 · USER:2026-07-28

## Context

The Neon Rivers lyric-video production (2026-07-24) put verse text on screen at ~8s while the vocals
did not start until 0:23. Shots are placed by cumulative duration from position 1; the track has its
own timing; nothing connects the two.

OQ-115 framed this as a choice between two corrections:

- **(a) fill-to-timestamp planning** — budget non-lyric shots so each lyric shot *starts* at its
  `[MM:SS]` stamp, keeping the whole track;
- **(b) track start-offset at export** — trim the track so the first lyric lands on the first lyric
  shot, discarding the intro.

Both are downstream repairs of an **ordering** problem. The planner never saw the track, so (a) pads
pictures to reach the music and (b) cuts music to reach the pictures.

> **USER:2026-07-28:** "The only way to nail it is to get the actual transcript and timestamps of the
> music BEFORE we generate any videoclips and the plan should then correctly sync the lyrics/videos
> with audio."

Two facts make this decisive rather than a preference:

1. **The dependency chain is already acyclic in the required direction.** The music brief is derived
   from the script (`requestMusicBrief` → `latestScript`), the track from the brief, the transcript
   from the track. `proposeShotPlan` already reads the music brief — REQ-STB-028, "music-led
   planning". Only the *track* is missing at planning time, and nothing about the plan is needed to
   produce it.
2. **The cost ratio is ~75:1 the wrong way round.** `musicPerTrackUsd: 0.08` against
   `videoPerSecondUsd: 0.10` — a 60-second film is **$6.00** of video, informed by an artifact that
   costs **$0.08** plus a text call. We currently generate the 1% artifact after the 99% one and then
   reconcile them. Option (a) makes that worse: a 23-second intro covered by filler is ~$2.30 of
   footage whose only job is to wait, paid on **every** render.

## Decision

**For music-led archetypes, shot planning is blocked until an active track exists and has been
transcribed, and the planner receives the track's `[MM:SS]` section stamps as a planning input.**

- The gate is the existing `generationBlocker` mechanism, which already expresses "X cannot be
  generated before Y" for continuity chains. No new machinery.
- The archetype decides. `lyric-video` already exists as a style card with
  `defaults: { audioMode: "music" }`; music-led is a property of the archetype, not a global mode.
- **Alignment is section-level, not per-line.** `shot.minSeconds` is 4 and lyric lines are commonly
  1–2s apart, so per-line shot alignment is arithmetically impossible. The planner lands shot
  boundaries on verse/chorus/bridge stamps — what `parseSectionTimes()` already extracts. Line-level
  precision is the captions' job (REQ-GEN-020), which is where it belongs anyway.
- Non-music-led projects keep today's order. The script still comes first in both.

```
script → music brief → track → transcript → shot plan → frames → takes → assembly
                                              ↑ moved; everything downstream is unchanged
```

## Alternatives considered

**(a) Fill-to-timestamp planning, keeping today's order.** Rejected on cost and determinism: it buys
filler footage at $0.10/s per render to cover intros, and it is prompt-directed, so the model has to
hit a numeric budget and any later duration edit silently breaks the alignment it achieved.

**(b) Track start-offset at export.** Rejected *as the primary answer*, retained as a fallback. It
cannot be primary because it discards the intro of a song the archetype exists to serve. It is kept
for the Suno round-trip (`docs/17` §1), where the user brings a finished track *after* a plan exists
— there is nothing to reorder there, so an offset is the only available lever.

**(c) Both, archetype-chosen** — the recommendation recorded in OQ-115, and the one this ADR
supersedes. It was a choice between two repairs; it did not ask why the repair was needed.

**Invert the whole pipeline (music first, then script).** Rejected: the music brief is *derived from*
the script, so this would be circular. Only one stage needs to move.

## Consequences

**Easier.** The defect class disappears rather than being corrected — a plan made against real stamps
cannot drift from them. No filler footage. No stored offset to go stale. The planner already accepts
music context, so the change is an additional input plus a gate, not a new pipeline.

**Harder, and these are real costs:**

- **A lyric video now costs $0.08 and one text call before you can plan shots.** For a user
  iterating on a shot plan without caring about music yet, that is friction we are imposing.
- **Re-generating the track invalidates the plan's alignment.** The stamps move; the plan does not.
  This needs to be surfaced in the UI, not silently tolerated — and it is the same staleness shape as
  REQ-STB-058's handoff provenance, which shipped a lying label the first time.
- **The gate can strand a project.** A music-led project whose track generation fails cannot plan at
  all. The blocker must name the reason and offer the way out, per REQ-GEN-027.
- **Section-level alignment will disappoint anyone expecting per-line sync.** The 4-second floor is a
  provider constraint, not a choice, and the UI should not imply otherwise.
- **Two planning orders now exist.** That is a fork, and CLAUDE.md §1.10 warns about exactly this.
  It is acceptable only because the archetype *selects a stage input*, not because a caller branches
  around the pipeline — if it ever becomes an `if (musicLed)` inside the planner, this ADR has been
  violated.
