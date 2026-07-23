# Feature — Shot Editor

> **Scripts-first (USER 2026-07-23):** the image script and video script are the primary controls on every shot — fully visible, editable, refs displayed, with Save & generate on the script itself. Reprompt the image until right, then make the video.

**Context:** STB/GEN · **Phase:** 1 (minimal golden-thread version) → 2 (full)

## User outcomes

- **Scripts first:** read and edit the shot's **image script** and **video script** — the exact prompts the models receive — with attached reference images displayed beside them and **Save & generate** on the script itself; empty scripts auto-compose (natural prose) from Direction + cast.
- Edit the shot's **Direction** as friendly structured fields (synopsis, subject, action, camera, mood, dialogue, audio notes, duration slider 4–8s, entities in this shot from the project's attached set) — supporting metadata behind the scripts.
- Generate **start-frame candidates** (default 2) — pick one, regenerate with a tweak instruction, or **AI-edit an existing candidate** ("same shot but at night") into a new candidate; optional end frame (Phase 4, OQ-101).
- Remove unwanted candidates (unselected only); every candidate is regenerable, nothing selected is ever destroyed.
- Generate a **Take** (cost shown before click); watch it inline; keep generating alternatives.
- **Retake with instruction** on any take ("slower camera, hold the smile") — Omni conversational editing.
- Select the winning take; A/B compare two takes side by side.
- Inspect any candidate's provenance: prompt snapshot, model, refs, cost.

## Key UI

- Panel or route with three lanes: Direction (form) → Frames (CandidateStrip per slot) → Takes (TakePlayer + CandidateStrip).
- Direction changes mark existing candidates "from older direction" (subtle badge, INV-STB-006 provenance).
- Frame candidates: draft-quality toggle (Lite model) for rapid look exploration; "upgrade to hero frame" (Pro model).
- Generate-take button disabled until start frame selected (unless text-mode enabled, BR-STB-002), with reason shown.

## BDD

- `SCN-STB-020` — Direction + frame → take generated → selected; storyboard card flips to `generated`.
- `SCN-STB-021` — Retake with instruction creates a new take linked `retake_of`; original preserved.
- `SCN-GEN-001` — Content-policy failure surfaces mapped message and direction edit hint.

## API

`PATCH /shots/{id}`, `POST /shots/{id}/frames`, `/frames/{id}/select`, `POST /shots/{id}/takes`, `/takes/{id}/retake`, `/takes/{id}/select`, `GET /generations/{id}`.

## Rules

INV-STB-001/003/004/006, BR-STB-002/003, BR-GEN-002/003.
