# Feature — Media Library

**Context:** MED  
**Status:** Template

## User outcomes

- Upload video/audio/image into project library.
- See processing progress; use only **ready** assets on timeline.
- Preview asset, view metadata (duration, resolution).

## Key UI

- Upload dropzone + progress list.
- Asset grid with filters (type, status).
- Failure retry affordance.

## BDD

- `SCN-MED-001` — Upload completes and asset becomes ready «epic TBD»

## API

Upload session + asset list — `07-api-contracts.md`.

## Rules

INV-MED-002 (ready before clip insert).
