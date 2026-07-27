# 01 — Ubiquitous Language

Authoritative glossary for the **AI Video Director**. One concept = one term. Do not introduce synonyms in new APIs without updating this table.

> **Reading order:** §1 core pipeline → §2 by context → §3 disambiguations → §4 open terms.

---

## 1. Core pipeline model (read first)

| Term | Definition |
|------|------------|
| **Organization** | Tenant boundary; billing, quotas, data isolation. |
| **User** | Human principal with roles in an organization. |
| **Project** | One video production: brief, format, script, storyboard, assets, exports, cost meter. |
| **Brief** | Structured intent for the project: idea, audience, tone, genre, format, target length. |
| **Format** | Project-level output contract: aspect ratio (16:9 or 9:16 MVP), resolution, target duration. |
| **Script** | Versioned narrative document for the project, drafted/revised with `gemini-3.6-flash`. |
| **Shot** | The atomic unit of the video: an ordered, 4–10 second planned segment with a **Direction**, frames, and takes. (UI may say "chapter" for casual users; the domain term is Shot.) |
| **Direction** | The shot's structured creative spec: synopsis, subject/action, camera, mood, dialogue/VO text, audio notes. Written by user and/or drafted by `gemini-3.6-flash`. |
| **Frame** | A generated (or uploaded) still image serving as a shot's **start frame** or **end frame**. A shot keeps multiple frame *candidates* per slot; one is **selected** per slot. |
| **Take** | One generated video candidate for a shot (Omni Flash output, native audio included). A shot keeps multiple takes; exactly one may be **selected**. |
| **Retake** | A new take created from an existing take plus an edit instruction (Omni conversational editing) or revised direction. |
| **Style Kit** | **Org-scoped** reusable visual identity: style prompt fragment + palette notes + reference images. One active kit attached per project; injected into every frame/take generation — the same look across many videos. |
| **Entity** | **Org-scoped** named subject with a kind — `company` \| `product` \| `person` \| `character` — plus description and 1–5 reference images. Attached to projects at setup (or anytime); referenced by shots for consistency across videos. |
| **Image Edit** | AI edit of any image asset via instruction (Nano Banana editing, e.g. "change her jacket to red"). Produces a **new** asset with `edit_of` lineage — used to groom entity references and frame candidates. |
| **Generation** | One recorded model call (script, direction, frame, take, music-brief text): model id, prompt/context snapshot, params, references, status, cost. |
| **Animatic** | Preview that plays each shot's selected start frame for the shot's duration, with music if attached — pacing check before paying for video. |
| **Music Brief** | Generated music prompt text. Rendered in one click by Lyria 3 (default) or carried to an external tool such as Suno and uploaded back — either way it yields the **Music Track**. |
| **Music Track** | Uploaded audio asset attached to the project for assembly mixing. |
| **Audio Mix Mode** | Project/shot policy for export audio: `native` (Omni audio only), `music` (music track only), `mix` (music bed under native audio). |
| **Assembly** | Deterministic combination of selected takes in shot order + audio mix. Never invokes generation models. |
| **Export** | An assembly rendered to a deliverable file via an **Export Preset**; downloadable/shareable. |
| **Asset** | Immutable stored binary + metadata (image, video, audio), generated or uploaded. |

**Hierarchy:**

```text
Organization
  └── Project (Brief, Format, cost meter)
        ├── Script (versions)
        ├── Shot* (ordered)
        │     ├── Frame candidates (start / end slots; one selected per slot)
        │     └── Take* (one selected)
        ├── Entity attachment* · Style Kit attachment (org library →)
        ├── Music Brief / Music Track
        ├── Generation* (provenance for everything above)
        └── Export*
```

---

## 2. By bounded context

### PLT — Platform

| Term | Definition |
|------|------------|
| **AuditEvent** | Append-only record of security-relevant actions. |
| **Quota** | Org-level generation spend/count limits per period. |
| **FeatureFlag** | Toggle for experimental features/models. |

### PRJ — Projects

| Term | Definition |
|------|------------|
| **ProjectMember** | User + role on a project (owner, editor, viewer). |
| **Cost Meter** | Rolled-up USD spend of all generations in the project. |
| **Template** | Post-MVP: reusable project starter (format + style kit + shot skeleton). See gap register. |

### STB — Story & Storyboard

| Term | Definition |
|------|------------|
| **Shot Plan** | Structured output of script breakdown: proposed shots with directions and durations. Applied to the storyboard as a batch the user reviews. |
| **Shot Status** | `planned` → `framed` (start frame selected) → `generated` (take selected) — derived, see `13-storyboard.md`. |
| **Selection** | The act of marking one frame candidate (per slot) or one take as the shot's chosen output. |

### GEN — Generation

| Term | Definition |
|------|------------|
| **Generation Kind** | `script` · `shot_plan` · `direction` · `frame` · `image_edit` · `take` · `retake` · `music_brief`. |
| **Prompt Assembly** | Deterministic composition of the model prompt: project brief + style kit + entities + shot direction (+ frames for takes). Logged verbatim in the generation record. |
| **Model Route** | Config mapping generation kind → model id + params (see `82-tech-stack.md`). |

### AST — Asset Library

| Term | Definition |
|------|------------|
| **AssetStatus** | `pending` → `ready` \| `failed`. Ready assets are immutable. |
| **Reference Image** | Image asset used to condition generations (style kit or entity). |
| **UploadSession** | Direct-to-storage upload flow (music tracks, reference images). |

### ASM — Assembly & Export

| Term | Definition |
|------|------------|
| **Storyboard Snapshot** | Immutable capture of shot order + selected takes + audio settings that an export renders from. |
| **ExportPreset** | Named output settings (resolution, container, bitrate). |
| **ShareLink** | Tokenized public URL for a completed export (view/download). |

---

## 3. Disambiguations

| Term | Not to confuse with |
|------|---------------------|
| **Shot** | **Take** — shot is the planned slot; take is one generated candidate filling it. |
| **Frame** | **Take** — frame is a still (Nano Banana); take is the video clip (Omni Flash). |
| **Style Kit** | **Entity** — style is the *look everywhere*; an entity is a *recurring subject* (company, product, person, or character). |
| **Image Edit** | **Retake** — image edit revises a still via Nano Banana; retake revises a video clip via Omni. |
| **Animatic** | **Export** — animatic is a client-side frame-based preview; export is the rendered deliverable. |
| **Generation** | **Asset** — generation is the recorded model call; asset is its stored output. |
| **Music Brief** | **Music Track** — brief is the prompt text; track is the resulting audio, whether generated by Lyria or uploaded from Suno. |

---

## 4. Open terms

| Term | Notes |
|------|-------|
| **Scene** | Optional grouping of shots (act structure, shared location) — OQ-108. |
| **Transition** | Between-shot treatment; MVP is hard cut — OQ-110. |
| **Template** | Reusable starter — gap register GAP-101. |
