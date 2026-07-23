# 15 — Assembly & Export (ASM)

**Context code:** ASM
**Status:** Active.

---

## 1. Purpose

Turn the storyboard's selected takes into deliverables: the client-side **Animatic** preview, the server-side **Assembly** (concat + audio mix via ffmpeg), **Export** jobs with presets, and **Share Links**. Never calls generation models.

---

## 2. Aggregates

| Aggregate | Responsibility |
|-----------|----------------|
| StoryboardSnapshot | Immutable capture: ordered (shot id, take asset id, duration), audio mix mode, music track asset id, transition policy |
| ExportJob | Status, progress, preset, snapshot ref, output asset, error |
| ExportPreset | Named output profile (resolution, container, bitrate, loudness target) |
| ShareLink | Token, export ref, expiry, revocation |

Export status: `queued` → `running` → `succeeded` | `failed`.

---

## 3. Invariants

| ID | Statement |
|----|-----------|
| INV-ASM-001 | An export renders exclusively from a StoryboardSnapshot; later storyboard edits never change a produced export. |
| INV-ASM-002 | A snapshot requires every included shot to have a selected `ready` take; shots without one must be explicitly excluded by the user at export time. |
| INV-ASM-003 | Assembly performs no generative calls — concat, transcode, and audio mix only. |
| INV-ASM-004 | Failed exports retain ffmpeg error detail and are retryable against the same snapshot. |
| INV-ASM-005 | Share links grant access only to the linked export's output (token-scoped, revocable, optional expiry). |

## 4. Business rules

| ID | Statement |
|----|-----------|
| BR-ASM-001 | Audio mix per project `audio_mix_mode`: `native` (per-take audio, concatenated), `music` (strip native, lay music track), `mix` (music bed under native audio with ducking at `config.audio.duck_db`). OQ-103 refines ducking defaults. |
| BR-ASM-002 | Music longer than the video fades out over `config.audio.fade_out_s` (2s); shorter music pads with silence (no looping in MVP). |
| BR-ASM-003 | Takes are normalized at assembly (resolution/fps per preset, loudness to `config.audio.lufs_target`, −14 LUFS default) so heterogeneous takes concat cleanly. |
| BR-ASM-004 | Transitions: hard cuts in MVP (OQ-110 tracks crossfade demand). |
| BR-ASM-005 | The Animatic is client-side: selected start frames shown for each shot's duration, music underneath if attached — zero server render cost. |

---

## 5. Pipeline

```
CreateSnapshot (validate INV-ASM-002)
  → queue ExportJob
  → worker: fetch takes → normalize (scale/fps/loudness) → concat
           → audio mix per mode → mux → object storage
  → asset ready → asm.ExportCompleted → UI (SSE) + download/share
```

Progress reported per stage; concurrency capped per org (`config.asm.max_concurrent_exports`).

---

## 6. Export presets (seed)

| Preset | Output |
|--------|--------|
| `social-vertical` | 1080×1920 MP4 H.264, 9:16 projects |
| `social-landscape` | 1920×1080 MP4 H.264, 16:9 projects |
| `master` | Highest available source resolution, high bitrate |

Preset must match project aspect ratio (no auto-crop in MVP — GAP-103).

---

## 7. Events

`asm.SnapshotCreated`, `asm.ExportQueued`, `asm.ExportProgress`, `asm.ExportCompleted`, `asm.ExportFailed`, `asm.ShareLinkCreated/Revoked`.

## 8. UX / API

`features/assembly-export.md`; API in `07-api-contracts.md` §ASM.

## 9. Open questions

OQ-103 (mix/ducking), OQ-110 (transitions).
