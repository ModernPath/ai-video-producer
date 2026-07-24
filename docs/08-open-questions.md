# 08 — Open Questions

Design ambiguities that block or shape requirements. Mark affected `REQ-*` as `BLOCKED` with the OQ id. (OQ-001…008 belonged to the archived v0 template; this register starts at OQ-101.)

| ID | Source | Question | Owner | Blocking | Status |
|----|--------|----------|-------|----------|--------|
| OQ-115 | Neon Rivers production | **Lyric-shot alignment strategy:** lyric-carrying shots appear by storyboard order, not when their line is SUNG (verse text at ~8s vs vocals at 0:23 on a long-intro track). (a) *Fill-to-timestamp planning* — plan prompt budgets non-lyric shots so each lyric shot STARTS at its [MM:SS] stamp; prompt+sync only, keeps the whole track, but long intros force filler footage (cost). (b) *Track start-offset at export* — export trims the track to start near the first lyric; one schema field + one ffmpeg `-ss`, cheap, but discards the musical intro. (c) Both, archetype-chosen (lyric-video → (a); short-form → (b)). Recommendation: (c) with (b) built first (smallest honest step). | — | REQ-STB-032 | OPEN |
| OQ-103 | `15` | **Mix mode defaults:** ducking depth, music gain, per-shot native-audio overrides (e.g. keep dialogue in 2 shots, music elsewhere)? | — | REQ-ASM-* (mix) | OPEN |
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
| OQ-101 | **Resolved by spike:** `GenerateVideosConfig` supports `lastFrame` + `referenceImages` (and `image` = start frame) on the generateVideos path — end-frame conditioning is a first-class parameter. | 2026-07-23 |
| OQ-102 | **Resolved by spike:** `resolution` is a config field on generateVideos; real 4s take returned 553KB MP4 (720p-class default). Presets stay source-resolution until upscale need is proven. | 2026-07-23 |
| OQ-104 | **Resolved by spike:** durations are discrete — Veo 3.1 accepts {4,6,8}s only (5 rejected by API). Provider snaps requested duration; shot cap lowered to 8s (INV-STB-001) until Omni's 10s returns via OQ-112. | 2026-07-23 |
| OQ-t-001…008 (template) | Superseded by product pivot to shot-based director; decisions recorded as ADR-001…007 in `82-tech-stack.md` and domain docs (no timecode model, no OT/CRDT, SSE, session auth). | 2026-07-23 |

- **OQ-114** (Lyria pricing) — RESOLVED 2026-07-23: $0.04/clip, $0.08/full song (pricing page); priceTable.musicPerTrackUsd.
- **OQ-112** (Omni Interactions video route) — **RESOLVED 2026-07-24 by paid spike (~$1.8, user-approved $100/day):**
  - `POST /v1beta/interactions` with `{model:"gemini-omni-flash-preview", input:[{type:"image",data,mime_type},…,{type:"text",text}], response_format:{type:"video"}}` — synchronous, ~22–31s wall, video returned base64 in a `model_output` step.
  - Tags live in the prompt TEXT: `<FIRST_FRAME>` → image_to_video (first-frame lock verified vs source frame), `<IMAGE_REF_N>` → reference_to_video (test-pattern ref faithfully wrapped onto a photoreal can). No `tag`/`task`/`duration_seconds` request params exist (400).
  - Duration is prompt-driven and FREE-FORM: "Duration: 10 seconds." → 10.01s clip (Veo's {4,6,8} limit gone).
  - Output: 1280x720 h264 + aac audio, 24fps. Billing is token-based and deterministic: 5,792 video tokens/s × $17.50/M = **$0.101/s ≈ Veo fast**. Input images ≈ 1,100 tok ($0.002).
  - → REQ-GEN-023 (PROPOSED): omni-video as alternate take route (refs + free durations + retake-by-conversation).
