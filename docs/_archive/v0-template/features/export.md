# Feature — Export

**Context:** RND  
**Status:** Template

## User outcomes

- Choose export preset (resolution, format).
- Queue render job; show progress and download link.
- Distinguish preview render vs final export if both offered.

## Key UI

- Export modal, job list, error detail + retry.

## BDD

- `SCN-RND-001` — Export completes with downloadable file «TBD»

## API

`POST /projects/{id}/renders`, job status — `07-api-contracts.md`.

## Open questions

OQ-007 (export gates).
