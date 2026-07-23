# 06 — UX Architecture

**Status:** Template with MVP surface inventory for an AI video editor.

---

## 1. Personas (seed)

| Persona | Goals |
|---------|--------|
| **Solo creator** | Fast rough cut, AI script/VO, export to social formats |
| **Pro editor** | Precision timeline, keyboard-driven edits, reliable export |
| **Producer / client** | Review, comment, approve without full edit tools |

Refine with user research; link decisions to `USER:` sources in epics.

---

## 2. Primary journeys

1. **Start project → import media → first cut on timeline → preview → export**
2. **Open AI producer → generate script/suggestions → accept edits → export**
3. **Share project → reviewer comments on timecode → editor resolves**

Each journey should map to BDD scenarios in epics (`EPIC-*`).

---

## 3. Screen / surface inventory

| Surface | Route (placeholder) | Context | Feature spec |
|---------|---------------------|---------|--------------|
| Home / projects | `/` | PRJ | `features/projects.md` |
| Media library | `/project/:id/library` | MED | `features/media-library.md` |
| Timeline editor | `/project/:id/edit` | TML | `features/timeline-editor.md` |
| Preview | embedded / panel | TML, RND | `features/timeline-editor.md` |
| AI producer | `/project/:id/ai` or dock | AGT | `features/ai-assistant.md` |
| Export | `/project/:id/export` | RND | `features/export.md` |
| Settings | `/settings/*` | PLT | «TBD» |

Reference captures (optional): `ux-screens/README.md`.

---

## 4. UX principles

- **Committed vs proposed** — AI changes visually distinct until accepted.
- **Undo/redo** — timeline operations recoverable (scope in TML domain doc).
- **Progressive disclosure** — simple default track layout; advanced modes later.
- **Accessibility** — keyboard timeline navigation, captions for preview (OQ-006).

---

## 5. Agent UI patterns

- Chat + structured **suggestion cards** (insert clip, replace text, generate VO).
- Show **prompt context** summary (what the model saw).
- Block export if unresolved failed assets or pending destructive suggestions (product decision — OQ-007).

---

## 6. Design system

Component conventions: `features/design-system.md` (placeholder).
