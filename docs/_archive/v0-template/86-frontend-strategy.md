# 86 — Frontend Strategy

**Status:** Template for the editor client.

---

## 1. Goals

- Responsive timeline and preview at 1080p proxy quality.
- Clear separation: **committed state** vs **AI suggestions**.
- Keyboard-first editing for pro persona (`06-ux-architecture.md`).

---

## 2. State management

«Options: server-owned sequence + optimistic commands vs local CRDT — align with OQ-005.»

---

## 3. Media handling

- Use MED proxy URLs in preview player.
- Waveform/thumbnail components fed by MED metadata.

---

## 4. Testing

- Component tests for timeline math (timecode — OQ-001).
- E2E: import → place clip → export smoke (`EPIC-TML-001` style).

---

## 5. Design system

See `features/design-system.md`.
