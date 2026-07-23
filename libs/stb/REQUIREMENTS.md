# Requirements Ledger — STB (Story & Storyboard)

## Dashboard — STB (Story & Storyboard)
Totals: 0 DONE · 7 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 4 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-STB-001 | Shot duration within config bounds | P1 | IN_REVIEW | INV-STB-001 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-002 | Shots hold a strict total order | P1 | IN_REVIEW | INV-STB-002 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-003 | Single selection per slot / take | P1 | IN_REVIEW | INV-STB-003 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-004 | Take selectable only when asset ready | P1 | IN_REVIEW | INV-STB-004 | tests/shots.int.spec.ts | src/service.ts |
| REQ-STB-005 | Take belongs to its shot, never moved | P2 | PROPOSED | INV-STB-005 | — | — |
| REQ-STB-006 | Frame re-selection keeps takes + provenance | P2 | PROPOSED | INV-STB-006 | — | — |
| REQ-STB-007 | Shot-plan apply protects paid shots | P2 | PROPOSED | INV-STB-007, BR-STB-005 | — | — |
| REQ-STB-008 | Script versions via draft/revise | P2 | IN_REVIEW | `docs/13` §6, BR-STB-005 | tests/script.int.spec.ts | src/service.ts |
| REQ-STB-009 | Candidate removal rules (soft, unselected) | P2 | PROPOSED | POL-STB-002/003 | — | — |
| REQ-STB-010 | Music brief: generate Suno prompt (attach/mix arms follow) | P3 | IN_REVIEW | BR-STB-007, `docs/17` §1 | tests/music.int.spec.ts + browser E2E | src/service.ts, apps/web (script page) |
| REQ-STB-011 | Shot plan proposal materializes and applies | P2 | IN_REVIEW | `docs/13` §6 ProposeShotPlan/ApplyShotPlan | tests/script.int.spec.ts | src/service.ts |

---

### REQ-STB-001 — Shot duration within config bounds
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-001
- **Statement:** Creating/updating a shot rejects durations outside `config.shot.minSeconds..maxSeconds`.
- **Acceptance criteria:**
  - GIVEN duration 6.5 WHEN CreateShot THEN shot persists with duration 6.5.
  - GIVEN duration 3 or 11 WHEN CreateShot/UpdateShot THEN rejected with `validation_failed` naming the bounds.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-002 — Shots hold a strict total order
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-002
- **Statement:** Each shot has a unique position within its project; new shots append at the end.
- **Acceptance criteria:**
  - GIVEN two created shots THEN positions are 1 and 2; listing returns them in order.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-003 — Single selection per slot / take
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-003
- **Statement:** A shot has at most one selected start frame, one selected end frame, one selected take; selecting replaces the previous selection.
- **Acceptance criteria:**
  - GIVEN take A selected WHEN SelectTake(B) THEN only B is selected.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-004 — Take selectable only when asset ready
- **Status:** IN_REVIEW · **Stage:** P1 · **Priority:** must
- **Source:** INV-STB-004
- **Statement:** SelectTake requires the take's video asset status `ready`.
- **Acceptance criteria:**
  - GIVEN a take whose asset is `pending`/`failed` WHEN SelectTake THEN rejected `asset_not_ready`.
- **Tests:** `tests/shots.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 1)

### REQ-STB-008 — Script versions via draft/revise
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** `docs/13` §6 (DraftScript), BR-STB-005
- **Statement:** DraftScript produces a new immutable script version via GEN (kind `script`); versions increment; content persists with generation provenance.
- **Acceptance criteria:**
  - GIVEN a project with a brief WHEN DraftScript completes THEN script_version v1 exists with non-empty content and generation_id.
  - GIVEN an existing v1 WHEN DraftScript again THEN v2 exists; v1 unchanged.
- **Tests:** `tests/script.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 2)

### REQ-STB-011 — Shot plan proposal materializes and applies
- **Status:** IN_REVIEW · **Stage:** P2 · **Priority:** must
- **Source:** `docs/13` §6 (ProposeShotPlan / ApplyShotPlan), INV-STB-001/002
- **Statement:** ProposeShotPlan (kind `shot_plan`) yields a stored proposal of shots (title, direction, duration within bounds); ApplyShotPlan creates those shots appended in order and marks the proposal applied. MVP: additive only; update/remove diff arms with paid-work protection follow in REQ-STB-007.
- **Acceptance criteria:**
  - GIVEN a script version WHEN ProposeShotPlan completes THEN a proposal exists with ≥3 shots, each duration within config bounds.
  - GIVEN a proposal WHEN ApplyShotPlan THEN shots exist in proposal order at the storyboard tail and the proposal is `applied`.
- **Tests:** `tests/script.int.spec.ts` · **Code:** `src/service.ts` · **Log:** LOG 2026-07-23 (slice 2)

### REQ-STB-010 — Music brief: generate Suno prompt
- **Status:** IN_REVIEW · **Stage:** P3 · **Priority:** should
- **Source:** BR-STB-007, `docs/17` §1 (manual Suno round-trip)
- **Statement:** RequestMusicBrief generates Suno-ready prompt text from title/brief/target length (+ latest script when present) via GEN kind `music_brief`; the project keeps one current brief (regenerate replaces, provenance retained via generation id). Track attach + mix modes are separate arms (need REQ-AST-004 uploads) — deferred explicitly.
- **Acceptance criteria:**
  - GIVEN a project WHEN RequestMusicBrief completes THEN a music_brief row exists whose prompt mentions the target duration.
  - GIVEN an existing brief WHEN regenerating THEN the row is replaced (new generation id), not duplicated.
- **Tests:** `tests/music.int.spec.ts` + browser E2E · **Code:** `src/service.ts` (requestMusicBrief/getMusicBrief), migration 0006 · **Log:** LOG 2026-07-23 (slice 3)

*(PROPOSED blocks 005–007, 009: statements live in `docs/13-storyboard.md`; elaborate when promoted.)*
