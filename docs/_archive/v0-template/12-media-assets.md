# 12 — Media Assets (MED)

**Context code:** MED  
**Status:** Template.

---

## 1. Purpose

Upload, store, ingest, and expose **MediaAsset** records and derivatives (proxies, waveforms, thumbnails).

---

## 2. Aggregates

| Aggregate | Notes |
|-----------|--------|
| MediaAsset | Metadata + storage keys |
| UploadSession | Resumable upload |

---

## 3. Invariants (seed)

| ID | Statement |
|----|-----------|
| INV-MED-001 | A ready asset must reference validated master object storage key. |
| INV-MED-002 | Clips may only reference assets in `ready` state (enforced at TML accept). |

---

## 4. Ingest pipeline

`uploading` → `processing` → `ready` | `failed` — document worker steps (ffmpeg, probes).

---

## 5. Events

`AssetUploaded`, `AssetProcessingStarted`, `AssetReady`, `AssetFailed`.

---

## 6. API

See `07-api-contracts.md` MED section; feature spec `features/media-library.md`.
