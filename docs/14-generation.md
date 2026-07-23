# 14 — Generation (GEN)

**Context code:** GEN
**Status:** Active — the only context that talks to model APIs.

---

## 1. Purpose

Execute and record **every** model call: script drafting, shot planning, direction text, frame images, video takes/retakes, music brief text. Owns prompt assembly, model routing, queueing, retries, cost accounting, and provenance. STB decides *what*; GEN decides *how* and remembers *exactly what happened*.

---

## 2. Aggregates

| Aggregate | Responsibility |
|-----------|----------------|
| Generation | One model call: kind, model, prompt snapshot, params, reference asset ids, status, cost, outputs, error |
| ModelRoute (config) | kind → model id + default params, versioned config, not DB rows unless runtime-editable |

Generation status: `queued` → `running` → `succeeded` | `failed` | `canceled`.

---

## 3. Invariants

| ID | Statement |
|----|-----------|
| INV-GEN-001 | Every generation persists, before execution: model id, full assembled prompt/context, params, reference asset ids, requesting principal, and target (project/shot/slot). |
| INV-GEN-002 | Outputs are written as new immutable AST assets; a generation never mutates or replaces an existing asset. |
| INV-GEN-003 | Actual cost (USD) is recorded on completion from response metadata or the routed price table; video cost derives from output duration × per-second rate. |
| INV-GEN-004 | A generation is refused (`quota_exceeded`) if the org's PLT quota or project cost cap would be breached — checked at enqueue time. |
| INV-GEN-005 | Retries reuse the same generation id and increment `attempt`; a retry after terminal failure is a **new** generation with `retry_of` set. |
| INV-GEN-006 | Content-policy rejections are terminal `failed` with mapped, user-actionable error codes — never silently retried. |

## 4. Business rules

| ID | Statement |
|----|-----------|
| BR-GEN-001 | Model routing (kind → model) comes from versioned config: defaults `script|shot_plan|direction|music_brief → gemini-3.6-flash`, `frame|image_edit → gemini-3.1-flash-image` (draft mode: `-lite`; hero mode: `gemini-3-pro-image`), `take|retake → gemini-omni-flash-preview`. |
| BR-GEN-002 | Frame requests generate `n` candidates (default `config.frame.candidates = 2`, max 4) in one logical generation. |
| BR-GEN-003 | Take requests attach: selected start frame (and end frame per OQ-101), style kit reference images, entity reference images for `direction.entity_ids` — capped at the model's reference-image limit, priority: frames > entities > style. Entity refs resolve to the entity's **current** images at enqueue time (BR-AST-004). |
| BR-GEN-006 | `image_edit` requests carry the source image + instruction (+ optional style kit refs); output is a new AST asset with `edit_of` = source (INV-AST-001). Used for entity reference grooming and frame-candidate edits. |
| BR-GEN-004 | Long-running video generations use provider async delivery (URI + polling per Omni docs); the worker downloads to object storage and only then marks the asset `ready`. |
| BR-GEN-005 | Concurrency per org is capped (`config.gen.max_concurrent_video`, default 3); excess queues FIFO. |

## 5. Prompt assembly (deterministic, tested)

Pure function per kind; snapshot stored verbatim (INV-GEN-001):

```
take_prompt(project, shot, style_kit, entities) =
  [format block: aspect ratio, duration]
  + [style block: style_kit.style_prompt]
  + [entity blocks: kind + name + description for direction.entity_ids]
  + [shot block: synopsis, subject, action, camera, mood]
  + [audio block: dialogue + audio_notes]        // Omni native audio
  + attachments: start frame, (end frame), reference images
```

Unit-tested against golden files; changes to assembly are versioned (`prompt_template_version` on the generation row).

## 6. Error taxonomy (mapped to UI)

| Code | Meaning | User action |
|------|---------|-------------|
| `quota_exceeded` | Org/project cap | Raise cap / wait |
| `content_policy` | Provider safety rejection | Reword direction (OQ-105 for UX copy) |
| `provider_unavailable` | 5xx/timeout after retries | Retry later (automatic retry policy: 3 attempts, exponential backoff) |
| `invalid_reference` | Reference asset missing/unsupported | Fix references |
| `output_unusable` | Provider returned empty/corrupt media | Auto-retry once, then surface |

---

## 7. Events

`gen.GenerationQueued`, `gen.GenerationStarted`, `gen.GenerationCompleted` (with output asset ids + cost), `gen.GenerationFailed`, `gen.GenerationCanceled`.

Consumers: STB (attach candidates to shot), PRJ (cost rollup), UI (live status via SSE).

---

## 8. Governance

- Single chokepoint: only `apps/worker` GEN executor holds Google API credentials.
- Per-generation audit trail satisfies "every AI change is traceable" (overview non-negotiable 2).
- Rate limiting + spend metering per org (PLT quotas) — INV-GEN-004.

## 9. Open questions

OQ-101 (end-frame API mechanism), OQ-102 (Omni output resolution options), OQ-104 (duration precision), OQ-105 (content-policy UX).
