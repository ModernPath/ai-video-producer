# 87 — Directing Playbook (USER epic 2026-07-23)

> **USER:** "significantly improve your taste and video directing capabilities. Think different
> kind of videos and come up with prompts that can combine the video capabilities to create
> amazing videos."

The capabilities exist (styles, entities/refs, frame-conditioned takes, retakes, animation
shots + effects, overlays, Lyria music with lyrics, MM:SS transcripts, music-sync, captions,
exports). This epic turns them into **direction**: named video archetypes whose prompt recipes
orchestrate the whole stack deliberately.

## Video archetypes (v1 set — each becomes a recipe)

| Archetype | Feel | Capability orchestration |
|---|---|---|
| **Brand pulse** (15–30s) | kinetic, confident | product entity in every shot · hard cuts on music sections (music-sync) · kinetic-text interstitials · end-card animation · instrumental Lyria @ high BPM |
| **Lyric video** (60–120s) | typography-first | vocal Lyria track FIRST → transcript → shots planned per section · kinetic/title animation shots carry the lyrics · burned captions off (text IS the visual) · light leaks + grain everywhere |
| **Cinematic mood film** (30–60s) | slow, atmospheric | 8s shots only · slow push-ins, no dialogue · Golden-Hour-class style kit · sparse ambient Lyria · lower-third only in the final shot |
| **Product launch** (20–30s) | precise, premium | macro product frames (hero quality) · match-cut video scripts (same composition, product state changes) · highlight-word end card · mix audio (native SFX + music bed ducked) |
| **Character story** (30–60s) | narrative | person/character entity with refs in EVERY shot (consistency) · dialogue lines in video scripts · retakes for performance ("hold the smile") · captions on for dialogue |
| **Hype countdown** (10–15s) | rapid-fire | 4s shots · kinetic numbers via animation shots between filmed beats · cuts every section boundary · high-BPM Lyria with a drop at the reveal |

## Directing principles (feed the script/plan prompts)

1. **Structure before beauty** — pick the emotional arc (tension→release, calm→build, loop),
   then map sections to shots; the music brief and shot plan must share the same arc.
2. **One idea per shot** — a shot advances exactly one beat; if a video script has two verbs
   fighting, split the shot.
3. **Continuity through entities** — the same subject appears in ≥60% of shots for brand/character
   pieces; refs attached everywhere the subject shows.
4. **Contrast cuts** — alternate wide/close, motion/still, filmed/graphic; never two identical
   compositions in a row.
5. **Land the cuts on the music** — plan durations to section boundaries (music-sync), and put
   the strongest image on the chorus.
6. **End with a held frame** — final shot is calmer and longer, or a graphic end-card;
   never cut away from the climax instantly.

## Implementation plan (REQ breakdown)

- **REQ-STB-026 — Archetype selection**: project picks an archetype (or "freeform"); the choice
  injects the recipe's directing block into script/plan/music prompts (config-driven recipe
  table, no literals in code).
- **REQ-STB-027 — Archetype-aware planning**: recipes bias shot durations, animation-shot use,
  style/audio-mode defaults, and music-brief language per the table above.
- **REQ-STB-028 — Lyrics-first flow (lyric video)**: generate track before the shot plan;
  plan shots FROM the transcript sections.
- Evaluation: for each archetype, one real golden-path render judged against the principles
  (taste review — frames + cut sheet in the LOG).
