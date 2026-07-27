# EPIC-STB-003 — Archetype directing: six recipes → whole-pipeline craft

- **Status:** DONE — retroactive backfill 2026-07-27 · **Superseded by:** EPIC-STB-001 (free-form Style Cards)
- **Owning context(s):** STB · GEN · PRJ
- **Build phase:** 7 (directing playbook, pre–Style Card)

## Sourced user outcome

> **USER:2026-07-23 (BACKLOG):** Directing/taste epic → `docs/87-directing-playbook.md` (6
> archetypes, 6 directing principles). Each archetype gets a real golden-path taste review when
> built.

Before free-form briefs (EPIC-STB-001), creative intent was chosen from six hardcoded archetypes
whose recipes injected directing prose into script, plan, and visual prompts.

## Linked user requirements

| UR | Statement | Status |
|---|---|---|
| UR-ARC-001 | As a director I can pick an archetype and have script/plan/prompts inherit its craft. | VALIDATED |
| UR-ARC-002 | As a director making a music video I get music-led planning with transcript in the plan prompt. | VALIDATED |

## BDD acceptance scenarios

| SCN | Statement | Upper status | Evidence |
|---|---|---|---|
| SCN-STB-030 | Archetype selection injects directing recipe into script/plan/frame/take prompts. | UPPER_VALIDATED | Snapshot E2E REQ-STB-026; `libs/gen/tests/prompt.spec.ts` |
| SCN-STB-031 | Music-led planning includes transcript block when a track is attached. | UPPER_VALIDATED | REQ-STB-028 prompt.spec + snapshot E2E |
| SCN-STB-032 | Route-aware durations and honest take cost estimates in UI. | UPPER_VALIDATED | REQ-STB-029, REQ-STB-030 browser + omni-video spec |

## Ledger trace

| Context | REQ ids |
|---|---|
| STB | REQ-STB-026, REQ-STB-027, REQ-STB-028, REQ-STB-029, REQ-STB-030 |
| GEN | REQ-GEN-013 extensions, prompt archetype injection |
| PRJ | `setProjectArchetype` (pre–Style Card store) |

## Supersession note

The six archetypes were re-expressed as **seed Style Cards** in EPIC-STB-001 (SR-DIR-003);
`libs/shared/src/config/archetypes.ts` was deleted. Archetype picker UI migrates to card-driven
prompts (REQ-GEN-026). This epic records the shipped archetype era for traceability only.

## Human approval

- **USER:2026-07-27:** Retroactive epic backfill — archetype directing shipped; superseded by EPIC-STB-001 for free-form style.
