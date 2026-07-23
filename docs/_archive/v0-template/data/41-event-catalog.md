# 41 — Event Catalog

Cross-context domain events (template). All payloads use the standard envelope below.

---

## 1. Event envelope

```typescript
interface EventEnvelope<T> {
  event_id: string;
  event_type: string;       // e.g. "tml.ClipAdded"
  organization_id: string;
  correlation_id: string;
  causation_id?: string;
  payload: T;
  occurred_at: string;      // ISO 8601 UTC
  schema_version: string;
}
```

**Naming:** `<context>.<AggregatePastTense>` — lowercase context prefix matching bounded context code.

**Idempotency:** consumers dedupe on `event_id`.

---

## 2. Realtime mapping (outline)

| Event types | Suggested transport | UI subscriber |
|-------------|---------------------|---------------|
| `med.Asset*` | SSE or WS | Media library |
| `rnd.RenderJob*` | SSE or WS | Export panel |
| `tml.SequenceUpdated` | WS (if collaborative) | Editor |

Resolve in OQ-004; avoid per-event transport sprawl.

---

## 3. Catalog (seed — expand payloads)

| Event | Producer | Consumers | Notes |
|-------|----------|-----------|-------|
| `plt.OrganizationCreated` | PLT | INS (future) | |
| `prj.ProjectCreated` | PRJ | AGT | |
| `med.AssetReady` | MED | TML, UI | Unblocks clip insert |
| `tml.ClipAdded` | TML | RND, COL | |
| `agt.SuggestionCreated` | AGT | UI | |
| `agt.SuggestionAccepted` | AGT | TML | |
| `rnd.RenderJobCompleted` | RND | UI, INT | |

---

## 4. Payload schemas

«Add JSON Schema or TypeScript types per event when commands are specified in domain docs.»
