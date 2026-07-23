# 41 — Event Catalog

Cross-context domain events. Written to `shared.outbox` in the producing transaction; relayed to in-process consumers, pg-boss jobs, and the project SSE stream.

---

## 1. Event envelope

```typescript
interface EventEnvelope<T> {
  event_id: string;         // uuid v7 — consumers dedupe on this
  event_type: string;       // "stb.TakeSelected"
  organization_id: string;
  project_id?: string;
  correlation_id: string;   // originating command_id
  causation_id?: string;
  payload: T;
  occurred_at: string;      // ISO 8601 UTC
  schema_version: string;
}
```

Naming: `<ctx>.<PastTense>`. Payload schemas are Zod, exported from `libs/<ctx>/contracts/events.ts` (canonical).

---

## 2. Catalog

| Event | Producer | Consumers | Notes / key payload |
|-------|----------|-----------|--------------------|
| `plt.OrganizationCreated` | PLT | — | |
| `plt.QuotaExceeded` | PLT | UI | period, limit, consumed |
| `prj.ProjectCreated` | PRJ | STB (init empty storyboard) | |
| `prj.CostThresholdReached` | PRJ | UI, email | 80%/100% of cap |
| `stb.ScriptDrafted` / `ScriptRevised` | STB | UI | version |
| `stb.ShotPlanApplied` | STB | UI | applied change ids |
| `stb.ShotAdded/Updated/Removed/ShotsReordered` | STB | UI, ASM (invalidate draft snapshot) | |
| `stb.FrameSelected` | STB | UI | shot, slot, frame_candidate_id |
| `stb.TakeSelected` | STB | UI, ASM | shot, take_id |
| `stb.MusicTrackAttached` | STB | ASM, UI | asset_id |
| `gen.GenerationQueued` | GEN | UI | kind, target, estimated_cost |
| `gen.GenerationStarted` | GEN | UI | |
| `gen.GenerationCompleted` | GEN | **STB** (create frame_candidate/take/script rows), PRJ (cost), UI | output_asset_ids, cost_usd |
| `gen.GenerationFailed` | GEN | STB, UI | error_code |
| `ast.AssetReady` | AST | GEN (unblocks), STB, UI | kind, dimensions/duration |
| `ast.AssetFailed` | AST | UI | |
| `ast.EntityCreated/Updated/Archived` | AST | UI | kind, ref changes |
| `ast.StyleKitCreated/Updated/Archived` | AST | UI | |
| `ast.ProjectAttachmentChanged` | AST | STB (validate direction.entity_ids), UI | attached/detached ids |
| `asm.ExportQueued/Progress/Completed/Failed` | ASM | UI, PRJ | stage, output_asset_id |
| `asm.ShareLinkCreated/Revoked` | ASM | UI | |

**Load-bearing choreography:** `gen.GenerationCompleted` → STB consumer materializes the candidate row on the shot (frame_candidate / take) — this is the seam that keeps GEN ignorant of storyboard semantics and STB ignorant of model APIs.

---

## 3. Realtime mapping

All `gen.*`, `ast.*`, `asm.*`, `stb.*` for a project fan out on `GET /projects/{id}/events` (SSE, ADR-006). Client refetches read models on event receipt (event = invalidation signal, not state transfer).
