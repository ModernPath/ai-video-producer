# Requirements Ledger — ASM (Assembly & Export)

## Dashboard — ASM (Assembly & Export)
Totals: 0 DONE · 4 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 5 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-ASM-001 | Snapshot requires ready takes; immutable | P1 | IN_REVIEW | INV-ASM-001/002 | tests/export.int.spec.ts | src/service.ts |
| REQ-ASM-002 | Export concatenates takes, no generation | P1 | IN_REVIEW | INV-ASM-003 | tests/export.int.spec.ts | src/service.ts |
| REQ-ASM-003 | Export output downloadable as ready asset | P1 | IN_REVIEW | `docs/15` §5 | tests/export.int.spec.ts + browser E2E | src/service.ts, apps/web (exports UI) |
| REQ-ASM-004 | Audio mix modes (native/music/mix) | P3 | PROPOSED | BR-ASM-001 | — | — |
| REQ-ASM-005 | Export presets + normalization | P3 | PROPOSED | BR-ASM-003, `docs/15` §6 | — | — |
| REQ-ASM-006 | Failed exports retain error, retryable | P2 | PROPOSED | INV-ASM-004 | — | — |
| REQ-ASM-007 | Share links (token, revocable) | P5 | PROPOSED | INV-ASM-005 | — | — |
| REQ-ASM-008 | Explicit exclusion of takeless shots | P2 | PROPOSED | INV-ASM-002 (exclusion arm) | — | — |
| REQ-ASM-009 | Animatic preview (client-side, zero render cost) | P2 | IN_REVIEW | BR-ASM-005 | tests/animatic.spec.ts + browser E2E | src/animatic.ts, apps/web/components/AnimaticPlayer.tsx |

---

### REQ-ASM-001 — Snapshot requires ready takes; immutable
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-ASM-001, INV-ASM-002
- **Statement:** CreateSnapshot captures ordered (shot, selected take, duration) rows; it fails listing offenders if any non-deleted shot lacks a selected ready take (MVP: no exclusions — REQ-ASM-008). Later storyboard edits never mutate a snapshot.
- **Acceptance criteria:**
  - GIVEN all shots have selected ready takes WHEN CreateSnapshot THEN items match storyboard order.
  - GIVEN a shot without selected take WHEN CreateSnapshot THEN rejected `missing_takes` with shot titles.
  - GIVEN a snapshot WHEN the shot's selection later changes THEN snapshot items are unchanged.
- **Tests:** `tests/export.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-ASM-002 — Export concatenates takes, no generation
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-ASM-003
- **Statement:** Export runs ffmpeg concat over the snapshot's take assets in order; it never calls GEN.
- **Acceptance criteria:**
  - GIVEN a 2-shot snapshot WHEN export runs THEN output is a valid MP4 whose size exceeds either input (concat evidence) and job is `succeeded`.
- **Tests:** `tests/export.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-ASM-003 — Export output downloadable as ready asset
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** `docs/15` §5
- **Statement:** The export job's output is stored under the exports key layout as a ready video asset, downloadable via the asset route.
- **Acceptance criteria:**
  - GIVEN a succeeded export THEN its `output_asset_id` resolves to a ready video asset with bytes in storage.
- **Tests:** `tests/export.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-ASM-009 — Animatic preview (client-side, zero render cost)
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** BR-ASM-005, `docs/06` §4 ("cheap before expensive")
- **Statement:** The storyboard offers an Animatic: each shot's selected start frame (fallback: first candidate) is shown for the shot's duration, in order, with a per-shot progress indication — no server render, no generation calls.
- **Acceptance criteria:**
  - GIVEN shot durations [6,5,6] THEN the cue list yields offsets [0,6,11] and total 17s; time t=7.2 maps to shot 2 (unit-tested math).
  - GIVEN a project with frames WHEN Animatic plays THEN frames advance per durations (browser evidence).
- **Tests:** `tests/animatic.spec.ts` + browser E2E · **Code:** `src/animatic.ts`, `apps/web/components/AnimaticPlayer.tsx` · **Log:** LOG 2026-07-23 (slice 2)

*(PROPOSED 004–008: statements in `docs/15-assembly-export.md`.)*
