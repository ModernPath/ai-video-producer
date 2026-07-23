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

1. **Idea → export (golden path):** brief → script draft (chat) → shot plan applied → storyboard review → generate frames (batch) → animatic check → generate takes (batch or per-shot) → select takes → export → share.
2. **Craft loop (per shot):** open shot → tweak direction → regenerate frame candidates → select → generate take → retake with edit instruction ("slower pan, warmer light") → select.
3. **Music flow:** get Music Brief → Suno round-trip → attach track → animatic against music → choose mix mode → export.
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
