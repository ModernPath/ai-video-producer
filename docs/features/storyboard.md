# Feature — Storyboard

> **First images immediately (USER 2026-07-23):** applying a shot plan should offer generating the first set of frames from the authored image scripts in one step (REQ-STB-017).

**Context:** STB · **Phase:** 2 · **The primary surface** (`/p/:id`)

## User outcomes

- See the whole video as ordered shot cards: selected frame thumb, title, duration, status fill (planned → framed → generated), per-shot cost so far.
- Reorder by drag (keyboard accessible); add/split/remove shots.
- Batch actions: "Generate all missing frames" (with count + est. cost), "Generate takes for framed shots".
- Play the **Animatic** at any time; play selected takes end-to-end once they exist ("rough cut" preview, client-side sequential playback).
- Jump into any shot's editor.

## Key UI

- Horizontal board (filmstrip) with total-duration bar vs target length.
- Status legend + filter (show shots needing attention).
- Sticky footer: animatic ▶ · batch buttons · cost meter · Export CTA (enabled when every included shot is `generated`).
- Empty state = "Draft script" or "Add first shot".

## BDD

- `SCN-STB-010` — Reorder persists atomically and animatic order follows.
- `SCN-STB-011` — Batch frame generation queues one generation per unframed shot and thumbnails appear via SSE.
- `SCN-STB-012` — Animatic plays selected frames for their durations with attached music.

## API

`GET /projects/{id}/shots`, `/shots/reorder`, batch = client fan-out of `/shots/{id}/frames|takes`, SSE `/events`.

## Rules

INV-STB-002/003, BR-STB-004, BR-ASM-005.
