# 13 — Timeline & Editing (TML)

**Context code:** TML  
**Status:** Template — core product domain.

---

## 1. Purpose

**Sequence**, **Track**, **Clip**, and **EditOperation** log — committed edit state for preview and render.

---

## 2. Aggregates

| Aggregate | Notes |
|-----------|--------|
| Sequence | Timeline root for a project |
| Track | Typed lane (video/audio/text) |
| Clip | Placement + trim + transforms |
| EditLog | Ordered commands (if event-sourced) |

---

## 3. Invariants (seed)

| ID | Statement |
|----|-----------|
| INV-TML-001 | Clips on a track must not overlap unless explicitly allowed (e.g. transitions). |
| INV-TML-002 | Clip `[in,out)` must lie within parent MediaAsset duration. |

---

## 4. Commands (outline)

InsertClip, MoveClip, TrimClip, SplitClip, RemoveClip, AddTransition — specify payloads in §6 when designed.

---

## 5. Undo / redo

«Strategy: command inversion vs snapshot — link to OQ-003.»

---

## 6. Events

`ClipAdded`, `ClipMoved`, `ClipTrimmed`, `SequenceUpdated`.

---

## 7. UX / API

`features/timeline-editor.md`, `07-api-contracts.md` command envelope.

---

## 8. Open questions

OQ-001, OQ-003, OQ-005.
