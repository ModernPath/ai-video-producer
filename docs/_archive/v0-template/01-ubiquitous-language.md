# 01 — Ubiquitous Language

Authoritative glossary for the **AI Video Producer**. One concept = one term. Extend via Prompt 0A; do not introduce synonyms in new APIs without updating this table.

> **Reading order:** §1 core edit model → §2 by context → §3 disambiguations → §4 open terms.

---

## 1. Core edit model (read first)

| Term | Definition |
|------|------------|
| **Organization** | Tenant boundary; billing and data isolation. |
| **Workspace** | UI synonym for organization (if used). |
| **User** | Human principal with roles in an organization. |
| **Project** | Container for one video production: timeline, assets, settings, export history. |
| **Sequence** | Editable timeline within a project (v1: one primary sequence per project — see OQ-002). |
| **Track** | Lane on the sequence (video, audio, text, overlay). |
| **Clip** | A span on a track referencing a **MediaAsset** (or generator) with in/out points and transforms. |
| **Playhead** | Current time position in the sequence. |
| **MediaAsset** | Uploaded or generated binary + metadata (duration, codecs, proxy URLs). |
| **Ingest** | Pipeline step: validate, store masters, generate proxies/waveforms. |
| **EditOperation** | Atomic change to sequence state (insert, move, trim, split, delete). |
| **Suggestion** | AI-proposed edit or content not yet applied to the sequence. |
| **Accept / Reject** | User decision on a suggestion; accept creates committed edit state. |
| **RenderJob** | Async job producing preview or export file from committed sequence state. |
| **ExportPreset** | Named output settings (resolution, codec, container). |

**Hierarchy:**

```text
Organization
  └── Project
        ├── MediaAsset*
        ├── Sequence
        │     └── Track* → Clip*
        ├── Suggestion* (AI, pending)
        └── RenderJob*
```

---

## 2. By bounded context

### PLT — Platform

| Term | Definition |
|------|------------|
| **AuditEvent** | Append-only record of security-relevant actions. |
| **FeatureFlag** | Toggle for experimental editor or AI features. |

### PRJ — Projects

| Term | Definition |
|------|------------|
| **ProjectMember** | User + role on a project (owner, editor, viewer). |
| **ProjectSettings** | Frame rate, resolution default, color space flags. |

### MED — Media

| Term | Definition |
|------|------------|
| **UploadSession** | Resumable upload to object storage. |
| **Proxy** | Lower-resolution derivative for editing preview. |
| **AssetStatus** | `uploading` \| `processing` \| `ready` \| `failed`. |

### TML — Timeline

| Term | Definition |
|------|------------|
| **Timecode** | Position on sequence; rational time or frame index (TBD OQ-001). |
| **Transition** | Blend between adjacent clips on a track. |
| **Marker** | User or AI annotation at a timecode. |

### AGT — AI Producer

| Term | Definition |
|------|------------|
| **ProducerSession** | Chat/thread tied to a project (optional sequence focus). |
| **PromptContext** | Snapshot of project metadata + selected clips/transcript sent to model. |
| **Generation** | Model output (text, image, audio, video) stored as asset or suggestion. |

### RND — Render

| Term | Definition |
|------|------------|
| **PreviewRender** | Fast render for scrubbing quality checks. |
| **ExportRender** | Final deliverable render. |

### COL — Collaboration

| Term | Definition |
|------|------------|
| **Comment** | Timecoded note on sequence or clip. |
| **ReviewStatus** | Workflow state for approval (if used). |

### INT — Integrations

| Term | Definition |
|------|------------|
| **ExternalProvider** | Stock, storage, or publish destination. |
| **ImportJob** | Pull media from provider into MED. |

---

## 3. Disambiguations

| Term | Not to confuse with |
|------|---------------------|
| **Clip** | **MediaAsset** — asset is library file; clip is timeline placement. |
| **Suggestion** | **Clip** — suggestion is provisional until accepted. |
| **RenderJob** | **Ingest** — ingest prepares assets; render outputs timeline. |

---

## 4. Terms to define (during discovery)

| Term | Notes |
|------|-------|
| **Storyboard** | Optional pre-edit artifact — in PRJ or AGT? |
| **Template** | Reusable project/sequence starter |
| **Version** | Project snapshot / history — OQ-003 |

See `08-open-questions.md`.
