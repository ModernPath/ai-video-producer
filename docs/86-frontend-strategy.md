# 86 — Frontend Strategy

**Status:** Active.

---

## 1. Goals

- The **storyboard reads as the product**: a cinematic shot-card board that makes progress visible and generation feel directed, not slot-machine.
- Perceived speed: optimistic UI on storyboard edits; skeleton→thumbnail→playable progression on candidates as SSE events land.
- Cost honesty in the chrome: estimated cost on every generate button, project cost meter always visible.

## 2. State model

- Server is source of truth; React Query caches read models (`/shots`, `/generations`, `/cost`).
- SSE events are **invalidation signals** → targeted refetch (no client-side event sourcing, no domain store).
- Storyboard edits: optimistic mutation + rollback on `conflict`; `command_id` generated client-side (UUIDv7) for idempotent retry.
- Single-editor MVP (ADR in `03` §4): no presence, no CRDT.

## 3. Key components

| Component | Notes |
|-----------|-------|
| ShotCard | Fill-state visual (planned/framed/generated), selected-frame thumb, duration badge, cost-to-complete hint |
| StoryboardBoard | Drag reorder (keyboard accessible), batch actions bar |
| CandidateStrip | Frame/take candidates with select + provenance popover ("what the model saw") |
| TakePlayer | HTML5 video, A/B compare two takes, retake-instruction input |
| AnimaticPlayer | Client-side: frames × durations + music track; scrub bar with shot boundaries |
| EntityPicker / StyleKitPicker | Project setup + settings; searchable org-library select |
| EditStudio | Source→result AI image editing with instruction box and `edit_of` history rail |
| CostMeter | Project spend vs cap; per-action estimates |
| GenerationToast/Queue | Live gen/export progress from SSE |

## 4. Media handling

- Thumbnails/posters (AST derivatives) in board views; signed URLs with client-side refresh on expiry.
- Animatic preloads selected frames + music; takes stream on demand.
- Export downloads via signed URL; share page is a public RSC route (`/s/:token`).

## 5. Testing

- Component: ShotCard states, CandidateStrip selection, AnimaticPlayer timing math (Vitest + Testing Library).
- E2E (Playwright + `MOCK_GEN`): golden thread (brief → animatic → export) as `EPIC-PRJ-001` / `EPIC-STB-002` / `EPIC-ASM-001` evidence (see `WORKLIST.md`).
- Visual regression on the storyboard board (it *is* the brand).

## 6. Design system

`features/design-system.md` — dark-first "director's room" aesthetic.
