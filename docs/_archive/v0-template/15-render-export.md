# 15 — Render & Export (RND)

**Context code:** RND  
**Status:** Template.

---

## 1. Purpose

**RenderJob** for preview and final **export** from committed sequence state + asset references.

---

## 2. Aggregates

| Aggregate | Notes |
|-----------|--------|
| RenderJob | Status, progress, output location |
| ExportPreset | Named output profile |

---

## 3. Invariants (seed)

| ID | Statement |
|----|-----------|
| INV-RND-001 | Render input must reference immutable sequence revision or snapshot id. |
| INV-RND-002 | Failed jobs retain error detail for user retry. |

---

## 4. Pipeline

Queue → worker (ffmpeg) → object storage → notify client (OQ-004).

---

## 5. Events

`RenderJobQueued`, `RenderJobProgress`, `RenderJobCompleted`, `RenderJobFailed`.

---

## 6. Feature spec

`features/export.md`.

---

## 7. Open questions

OQ-007 (export gates).
