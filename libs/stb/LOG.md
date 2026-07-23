# Build Log — STB (Story & Storyboard)

## 2026-07-23 — Context scaffolded (Prompt 0B)
**Done:** lib skeleton, empty ledger, build guide.
**Decisions:** contracts in `./contracts` (Zod canonical).
**Deferred:** ledger seeding → Prompt 1.
**Discovered:** —
**Follow-ups:** seed requirements from docs/13-storyboard.md.
**Gate:** n/a (no tests yet).

## 2026-07-23 — Ledger seeded (Prompt 1, compact)
**Done:** 10 REQs from docs/13; 4 READY (golden-thread shot mechanics), 6 PROPOSED compact.
**Decisions:** learning from GEN seed — PROPOSED rows stay one-liners until promoted (less ledger churn).
**Follow-ups:** Prompt 2 slice on 001–004 now.
**Gate:** n/a.

## 2026-07-23 — STB slice 1: shot mechanics + golden thread (4 × READY → IN_REVIEW)
**Done:** REQ-STB-001..004 — duration bounds from config, strict ordering, single selection, ready-only take selection; requestFrame/requestTake enqueue via GEN; materializeGenerationOutput consumes completions into frame_candidate/take rows (docs/41 choreography, synchronous for now). Migration 0003. Web UI: projects + storyboard pages with server actions; dev-inline queue drain. Browser-verified: planned → framed → generated with selections.
**Decisions:** dev tenancy = auto "Local Studio" org until PLT auth (Phase 5). Dev-inline worker drain in server actions — replace with apps/worker + pg-boss (BACKLOG).
**Deviation (learning):** red-first was not strictly observed — tests and implementation were authored in one pass (GEN slice did observe it). Next slices: write + run failing tests before implementing.
**Deferred:** reorder command (part of REQ-STB-002 full scope) → next slice; fixture tiles are CSS gradients until AST storage serves real bytes.
**Discovered:** header "0/1 generated" briefly shown pre-refresh — revalidation is fine, no action.
**Follow-ups:** human review for 001–004; worker extraction; AST ledger seed.
**Gate:** full suite green (20 tests).
