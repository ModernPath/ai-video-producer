# 06 — UX Architecture

**Status:** Active.

---

## 1. Personas

| Persona | Goals | Design consequence |
|---------|--------|--------------------|
| **Casual creator** (funny clips, memes) | Idea → shareable video in minutes, zero jargon | "Just make it" path: brief → auto script → auto shot plan → batch-generate → export with one review stop |
| **Brand marketer** | On-brand product/brand videos, consistent look across a series | Org library (company/product entities + style kits) front and center; cost visibility; approval-friendly review |
| **Music-video maker** | Visuals timed to a track, strong art direction | Music-first flow (attach track early, animatic against it), per-shot art control, retakes |

---

## 2. Primary journeys

1. **Describe → shots-with-scripts → first images → export (golden path, USER-canonical):** type the video description → AI returns shots each carrying image script + video script + duration + reference images → first frames generate from the image scripts immediately → reprompt image scripts until frames are right → generate takes from video scripts → select → export.
2. **Craft loop (per shot):** edit the image script → Save & generate frame → repeat until right → edit the video script → Save & generate take → select. Scripts are the control surface; what you read is exactly what the model receives.
3. **Music flow:** get Music Brief → render with Lyria 3 (or take it to Suno) → attach track → animatic against music → choose mix mode → export.
4. **Consistency flow:** build the org library once — **Entities** (company, product, person, character; from uploaded photos/logos or generated sheets, groomed with AI image edits) and **Style Kits**. New project setup asks "who's in this video, and in what style?" — pick from the library and every frame/take carries them. Same cast + look across a whole series of videos.

Each journey maps to BDD scenarios in epics (`EPIC-*`).

---

## 3. Surface inventory

| Surface | Route | Context | Feature spec |
|---------|-------|---------|--------------|
| Home / projects | `/` | PRJ | `features/projects.md` |
| Script studio | `/p/:id/script` | STB | `features/script-studio.md` |
| **Storyboard** (primary) | `/p/:id` | STB | `features/storyboard.md` |
| Shot editor | `/p/:id/shot/:shotId` (or side panel) | STB, GEN | `features/shot-editor.md` |
| Project library view | `/p/:id/library` | AST | `features/library-style.md` |
| Org library (entities & styles) | `/library` | AST | `features/library-style.md` |
| Assemble & export | `/p/:id/export` | ASM | `features/assembly-export.md` |
| Share page (public) | `/s/:token` | ASM | `features/assembly-export.md` |
| Settings / org / usage | `/settings/*` | PLT, PRJ | — |

The **Storyboard is the home surface** of a project — everything else is reachable from it. There is no timeline surface.

---

## 4. UX principles

- **Cheap before expensive.** The UI always offers the free/cheap next step first (edit text, regenerate frame) before the paid one (generate take). Every take-generating button shows estimated cost ("≈ $0.80 · 8s").
- **Candidates, not overwrites.** New generations appear beside old ones; selection is explicit; nothing paid-for is ever lost.
- **Status at a glance.** Shot cards show derived status (planned / framed / generated) as a visual fill state; the storyboard reads as a progress board.
- **Batch + focus.** Everything batchable ("generate all missing frames") with per-shot focus for craft.
- **Honest failures.** Content-policy and provider errors in plain language with a suggested next action (OQ-105).
- **Keyboard:** arrows navigate shots, enter opens shot editor, space plays animatic.
- **Accessibility:** full keyboard operability, alt text from directions, captions from dialogue fields at export (OQ-111).

---

## 5. Agent UX patterns

- Script studio is a chat, but its output lands in **structured artifacts** (script versions, shot-plan diffs) — never chat-only state.
- Shot-plan application is a **reviewable diff** (add/update/remove per shot) with paid work protected (INV-STB-007).
- "What the model saw" disclosure per generation (prompt snapshot from GEN) — one click from any candidate.

---

## 6. Design system

`features/design-system.md`.
