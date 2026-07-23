# 08 — Open Questions

Design ambiguities that block or shape requirements. Mark affected `REQ-*` as `BLOCKED` with the OQ id.

| ID | Source | Question | Owner | Blocking | Status |
|----|--------|----------|-------|----------|--------|
| OQ-001 | `01` Timecode | Frame-accurate model: rational time vs frame index vs both? | — | REQ-TML-* (trim/split) | OPEN |
| OQ-002 | `01` Sequence | Multiple sequences per project in v1? | — | REQ-PRJ-* | OPEN |
| OQ-003 | `01` Version | Project/version snapshots: event sourcing vs periodic snapshot? | — | REQ-TML-* | OPEN |
| OQ-004 | `03` Realtime | WS vs SSE for render/upload progress and collaboration | — | REQ-RND-*, UI | OPEN |
| OQ-005 | `03` Timeline sync | OT vs CRDT vs server-serialized commands for multi-user edit | — | REQ-TML-*, REQ-COL-* | OPEN |
| OQ-006 | `06` A11y | Caption/transcript requirements for MVP? | — | REQ-TML-* | OPEN |
| OQ-007 | `06` Export gates | Block export on failed assets or pending AI suggestions? | — | REQ-RND-* | OPEN |
| OQ-008 | `07` Auth | BFF session vs SPA bearer; refresh strategy | — | REQ-PLT-* | OPEN |

---

## Resolved

*(Move rows here with resolution date and doc updates.)*
