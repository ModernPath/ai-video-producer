# 08 — Open Questions

Design ambiguities that block or shape requirements. Mark affected `REQ-*` as `BLOCKED` with the OQ id. (OQ-001…008 belonged to the archived v0 template; this register starts at OQ-101.)

| ID | Source | Question | Owner | Blocking | Status |
|----|--------|----------|-------|----------|--------|
| OQ-101 | `13`/`14` | **End-frame conditioning:** does Omni Flash accept an explicit last-frame parameter, or only reference images + prompt language? Needs an API spike; determines `RequestTake` contract for end frames. | — | REQ-STB-* (end frame), REQ-GEN-* | OPEN |
| OQ-102 | `14`/`15` | **Omni output resolution:** what resolutions does `gemini-omni-flash-preview` return per aspect ratio? Determines whether `master` preset upscales and what we promise in export presets. | — | REQ-ASM-* | OPEN |
| OQ-103 | `15` | **Mix mode defaults:** ducking depth, music gain, per-shot native-audio overrides (e.g. keep dialogue in 2 shots, music elsewhere)? | — | REQ-ASM-* (mix) | OPEN |
| OQ-104 | `13`/`14` | **Duration precision:** can we request an exact clip length (e.g. 6.5s) or only bands? If output length ≠ requested, do we trim at assembly or accept drift? | — | REQ-STB-001, REQ-ASM-* | OPEN |
| OQ-105 | `14`/`06` | **Content-policy UX:** wording and remediation guidance when Google rejects a generation; do we pre-screen directions with `gemini-3.6-flash` before spending? | — | REQ-GEN-* (errors) | OPEN |
| OQ-106 | `03` | **Worker heartbeat/resume:** on worker crash mid-video-generation, do we re-poll the provider operation or restart the generation (double cost)? | — | REQ-GEN-* (reliability) | OPEN |
| OQ-107 | `10`/`11` | **Billing model:** subscription with included generation credits vs pure usage; affects quota semantics and cost-meter UX. | — | REQ-PLT-* (quota) | OPEN |
| OQ-108 | `01`/`13` | **Scenes:** is shot grouping (scene/act) needed for target lengths ≤ ~90s, or is a flat ordered list enough for MVP? | — | REQ-STB-* (model) | OPEN |
| OQ-109 | `13` | **Re-plan diff UX:** after script revision, how is the proposed shot diff presented and partially applied without losing paid takes? | — | REQ-STB-* (plan apply) | OPEN |
| OQ-110 | `15` | **Transitions:** hard cuts only for MVP confirmed? Crossfade/dip-to-black as preset option later? | — | REQ-ASM-* | OPEN |
| OQ-111 | `06` | **Captions:** burn-in or sidecar captions generated from dialogue fields at export? A11y and social-mute-autoplay value vs scope. | — | REQ-ASM-* | OPEN |

---

## Resolved

| ID | Resolution | Date |
|----|------------|------|
| OQ-t-001…008 (template) | Superseded by product pivot to shot-based director; decisions recorded as ADR-001…007 in `82-tech-stack.md` and domain docs (no timecode model, no OT/CRDT, SSE, session auth). | 2026-07-23 |
