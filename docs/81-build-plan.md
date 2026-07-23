# 81 — Build Plan

**Status:** Active. Thin vertical slices; the magic moment ships first.

---

## 1. Phases

| Phase | Goal | Contexts | Exit demo |
|-------|------|----------|-----------|
| **0 — Harness** | Monorepo, Compose (postgres+minio), CI, migrations, `MOCK_GEN` fixture mode, empty vertical test | — | create project → persist → query |
| **1 — Golden thread** ⭐ | *One shot → start frame → take → download the clip.* Single-user dev auth. Proves Gemini image+video APIs, async polling, storage, job queue, cost recording end-to-end | PRJ, STB(min), GEN, AST | type a direction, click twice, download an 8s MP4 with audio |
| **2 — Storyboard** | Script studio (draft/revise), shot plan propose/apply, shot CRUD/reorder, frame candidates + selection, batch generate, animatic | STB, GEN | brief → watchable animatic |
| **3 — Assembly** | Takes at scale (batch, retakes), take selection, snapshot → ffmpeg concat → export presets → download; music brief + track attach + mix modes | ASM, STB | full brief → finished 30s video with music |
| **4 — Consistency & craft** | Org library: entities (company/product/person/character, sheet flow) + style kits, AI image-edit studio for references, reference injection, end frames (post OQ-101 spike), retake-with-instruction UX | AST, GEN, STB | two videos with the same entity cast & look |
| **5 — Accounts & cost** | Real auth, orgs/members, quotas, cost meter + caps, share links | PLT, PRJ, ASM | invite a teammate, hit a cap, share a link |
| **6 — Polish & spread** | Templates, captions (OQ-111), transitions if validated (OQ-110), publish integrations (GAP-105) | — | — |

**Phase 1 is deliberately before storyboard UX:** the riskiest unknowns are provider-facing (OQ-101/102/104/106). Spike them with real money in week one, feed answers back into `13`/`14` before building broad UI.

---

## 2. Milestone gates

Each phase closes with: epic(s) `DONE` per `WORKLIST.md` gates, demo recorded, OQ register swept, `PROGRESS.md` refreshed. Phase 1 additionally closes OQ-101, OQ-102, OQ-104 (spike findings → domain docs).

---

## 3. Risks

| Risk | Mitigation |
|------|------------|
| Omni preview API instability / capability drift | GEN chokepoint + model routing config; `MOCK_GEN` keeps dev unblocked; re-verify §3 facts of `00` each phase |
| Generation cost during development | `MOCK_GEN` default in dev/CI; real-API tests behind explicit flag with per-run budget |
| Take quality disappoints users | Frames-first workflow + animatic keep iteration cheap; retakes with instructions; candidate history never lost |
| Duration drift (output ≠ requested) | OQ-104 spike; assembly-side trim policy decided in Phase 3 |
| ffmpeg edge cases (mixed fps/res) | BR-ASM-003 normalization; golden-file assembly tests |

---

## 4. Traceability

Work packages → epics in `epics/` and `REQ-*` in `libs/{plt,prj,stb,gen,ast,asm}/REQUIREMENTS.md`; roll up in `WORKLIST.md` / `PROGRESS.md`.
