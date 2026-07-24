# AI Video Director — Target Design Specification

**Version:** 1.0 (product-specific — replaces the v0 generic-NLE template, archived in `_archive/v0-template/`)
**Status:** Active design baseline
**Scope:** Domain model, bounded contexts, UX, API contracts, data model, and events for the **AI Video Director**.

---

## 1. What this product is

The **AI Video Director** takes a creator from *idea* to *finished video* through a directed, shot-based pipeline — not a traditional multi-track editor. The user works like a director with an AI crew:

1. **Describe** — give the AI a description of what you want (the **video prompt**), plus the cast of reusable entities. *(USER-clarified core flow, 2026-07-23.)*
2. **Script → Shots with scripts** — `gemini-3.6-flash` turns the description into a script divided into ordered **Shots** (4–8s on the current Veo route). **Every shot carries: (a) a starting-image script, (b) a video script, (c) its duration, (d) its reference images.** These authored, editable scripts are the primary creative artifact; direction fields are supporting metadata.
3. **First images immediately** — the image scripts generate the first set of start frames right away. The user **reprompts any image script and regenerates** until the frame is right — *before* spending on video.
4. **Takes** — each shot's video is generated from its video script, conditioned on the chosen start frame and reference images. Multiple takes; the user selects one.
5. **Audio** — native Omni audio per clip, and/or a **Music Brief** (a prompt the user feeds to Suno) whose resulting track is attached and mixed over the assembly.
6. **Assembly & Export** — selected takes are concatenated, audio is mixed, and the final video is exported (ffmpeg, no re-generation).

Use cases: brand videos, funny clips, music videos, product teasers, social content.

Design thesis:

```
Script + Shot Plan + Consistent Look + Cheap Iteration on Frames
+ Expensive Generation Only When Committed
= AI-Native Video Direction
```

**Non-negotiables (target):**

1. **The Storyboard is the system of record.** Shots, their order, selected frames and selected takes fully determine the output. Generations are candidates until selected.
2. **Every generation is traceable and immutable.** Model id, full prompt/context snapshot, reference assets, parameters, and cost are recorded per generation; regeneration creates a new candidate, never overwrites.
3. **Cheap before expensive.** Iterate on script (≈free) and frames (cents) before video ($0.15/s). The **Animatic** preview lets users judge pacing and look before spending on clips.
4. **Export never generates.** Assembly is deterministic: concat + mix from immutable, already-rendered takes.
5. **Everything is revisable, nothing is destroyed.** Every script, image, and clip can be edited, regenerated, or removed at any time — edits and regenerations create new candidates/versions with provenance; removal is soft and never touches anything selected or exported.

### 1.1 Repository layout (target)

| Path | Purpose |
|------|---------|
| `docs/` | Canonical design (this suite) |
| `libs/<ctx>/` | Bounded-context code + `REQUIREMENTS.md` |
| `apps/web` | Next.js app (UI + API) |
| `apps/worker` | Generation + media workers (Gemini calls, ffmpeg) |
| `epics/` | V-model epic records |
| `AGENTS.md`, `CLAUDE.md`, `WORKLIST.md` | Agent + build process |

---

## 2. Core capabilities (MVP-oriented)

- **Projects** — one video production per project: format (aspect ratio, resolution, target length), brief, cost meter (`PRJ`).
- **Script studio** — chat-driven script drafting and revision with `gemini-3.6-flash`; structured output → shot plan (`STB`, `GEN`).
- **Storyboard** — ordered shot cards; per-shot direction fields; drag reorder; add/split/remove shots (`STB`).
- **Shot editor** — generate/pick start & end frames (image candidates), generate/pick takes (video candidates), retake with edit instructions (`STB`, `GEN`).
- **Entity & Style library (org-level)** — reusable named **Entities** (companies, products, people, characters) and **Style Kits**, each with descriptions + reference images; pick them at project setup to keep many videos consistent. Reference images are **AI-editable** before use (change clothing, styling, setting) (`AST`, `GEN`).
- **Animatic** — plays selected frames with shot timings (+ scratch/attached music) before any video is generated (`STB`, `ASM`).
- **Music** — generate a Music Brief for Suno; upload the resulting track; choose native-audio vs music-only vs mix per project (`STB`, `ASM`).
- **Assembly & export** — concat selected takes, mix audio, export presets, download/share (`ASM`).

Surface specs: `docs/features/`.

---

## 3. Model facts this design depends on

Verified 2026-07-23 against Google docs (see `82-tech-stack.md` §4 for links; re-verify at build time — OQ-101/102):

| Capability | Model | Facts |
|---|---|---|
| Script / shot planning / prompts | `gemini-3.6-flash` | 1M in / 65k out tokens, structured output, function calling |
| Frame images | `gemini-3.1-flash-image` (Nano Banana), `-lite`, `gemini-3-pro-image` | AR: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 · res 0.5K–4K (Lite: 1K) · up to 14 reference images · character consistency with 4–5 refs · text-prompt image editing |
| Video clips | **`veo-3.1-fast-generate-preview`** (current route; Omni pending OQ-112) | Durations **{4, 6, 8}s only** (spike-verified) · 16:9 and 9:16 · **native audio** · start-frame conditioning via `image` param, `lastFrame` + `referenceImages` supported · **$0.15/s** (verified) · long-running op + polling |

Consequences baked into the domain: shot duration is capped at **8s** (Veo route; snaps to {4,6,8}); aspect ratio 16:9 or 9:16 (MVP); per-take cost **$0.60–$1.20** and per-frame **$0.034–$0.067** (verified per-image pricing) so generation is explicit and metered; end-frame conditioning is API-supported (`lastFrame`, OQ-101 resolved) and ships with the retake/edit arm.

---

## 4. Document map

| # | Document | Contents |
|---|----------|----------|
| 00 | `00-overview.md` | This file |
| 01 | `01-ubiquitous-language.md` | Glossary |
| 02 | `02-bounded-contexts.md` | Context map, ownership |
| 03 | `03-platform-architecture.md` | Topology, apps, jobs, deploy |
| 06 | `06-ux-architecture.md` | Personas, journeys, surfaces |
| 07 | `07-api-contracts.md` | API conventions and resources |
| 08 | `08-open-questions.md` | OQ register |
| — | `gap-register.md` | Deferred capabilities |
| 10 | `10-platform-identity.md` | PLT domain |
| 11 | `11-projects.md` | PRJ domain |
| 12 | `12-asset-library.md` | AST domain (assets, entities, style kits) |
| 13 | `13-storyboard.md` | STB domain (script, shots, frames, takes, music brief) — **core** |
| 14 | `14-generation.md` | GEN domain (jobs, model routing, cost, provenance) |
| 15 | `15-assembly-export.md` | ASM domain (animatic, assembly, export, audio mix) |
| 17 | `17-integrations.md` | Suno handoff, future publish targets |
| 40–41 | `data/*` | Schema and events |
| 81–82, 86 | Build plan, tech stack, frontend | Phasing, ADRs, client strategy |
| — | `features/*` | Per-surface UX specs |

**Reading order (implementers):** 01 → 02 → 13 → 14 → 06 → `features/<surface>` → 07 → 41 → 40 → your context doc.

**Process:** `CLAUDE.md` (ledger loop §6, V-model/epics §5B).

---

## 5. Conventions

- **Naming:** English in code and APIs; UI may localize labels.
- **Rule IDs:** `BR-<CTX>-NNN`, `INV-<CTX>-NNN`, policies `POL-<CTX>-NNN`.
- **Open questions:** `OQ-1NN` in `08-open-questions.md`; blocked reqs cite OQ id. (OQ-001…008 belonged to the archived template.)
- **IDs:** UUIDv7 (time-ordered; ADR-004 in `82-tech-stack.md`).
- **Time:** `timestamptz` UTC. Shot durations are decimal **seconds** (`numeric(4,1)`) — no frame-accurate timecode model; this is a shot-based product, not an NLE.
- **Money:** generation cost in USD `numeric(10,4)` on every generation row.
- **Multi-tenancy:** `organization_id` on tenant rows; RLS per `10-platform-identity.md`.
- **Events:** past tense (`ShotAdded`, `GenerationCompleted`); envelope in `data/41-event-catalog.md`.
- **Configuration:** model ids, duration bounds (4–10s), cost caps, resolution defaults come from versioned config — never literals (root `CLAUDE.md` §1.4).

---

## 6. Bounded contexts (summary)

| Code | Name | Role |
|------|------|------|
| **PLT** | Platform & Identity | Tenancy, auth, audit, config |
| **PRJ** | Projects | Project lifecycle, format, membership, cost rollup |
| **STB** | Story & Storyboard | Script, shots, frames/takes selection, music brief — **system of record** |
| **GEN** | Generation | All model calls: jobs, routing, prompt assembly, provenance, cost |
| **AST** | Asset Library | Immutable media assets, org-level entities & style kits, uploads |
| **ASM** | Assembly & Export | Animatic, concat, audio mix, presets, delivery, share links |

Full map: `02-bounded-contexts.md`.

---

*When this overview disagrees with a domain doc on domain detail, the domain doc wins. When a domain doc disagrees on context codes or glossary terms, **01** and **02** win.*


## Capability deltas (2026-07-23, USER epics)

- **Music:** brief → timed lyrics ([Verse]/[Chorus]) unless instrumental → one-click Lyria 3
  full song ($0.08) attached as the track → MM:SS transcription → captions burned on export.
- **Animations (ANM):** free Remotion title-card takes + transparent lower-third overlays
  composited onto generated takes (see `docs/features/animations.md`).
- **Veo price:** $0.10/s at 720p (pricing page 2026-07-23); estimates corrected from $0.15/s.
