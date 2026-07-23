# ANM — Requirements Ledger

## Dashboard — ANM (Animations)
Totals: 0 DONE · 1 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 2 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-ANM-001 | Title-card animation takes (pure Remotion scenes) | P6 | IN_REVIEW | USER Remotion epic 2026-07-23 | tests/render.int.spec.ts (RUN_RENDER) + real chain + browser | src/*, gen executor branch, migration 0018, ✦ Animate UI |
| REQ-ANM-002 | Animation overlays on generated shots (layers/transparency) | P6 | PROPOSED | USER Remotion epic; remotion.dev/docs/layers,transparency,greenscreen | — | — |
| REQ-ANM-003 | Caption/lyric overlays from MM:SS transcripts | P6 | PROPOSED | USER Remotion epic + REQ-GEN-020 | — | — |

### REQ-ANM-001 — Title-card animation takes
- **Status:** IN_REVIEW · **Stage:** P6 · **Priority:** should · **Owner:** —
- **Raised-by:** USER 2026-07-23 ("generate separate scenes with purely remotion animations")
- **Source:** remotion.dev/docs/ssr-node; BACKLOG epic
- **Statement:** A shot can get a free animation take: the TitleCard template (brand-dark, spring-animated text + accent underline, fade-out) renders server-side at the shot's duration/aspect via Remotion and lands as a normal take (selectable, exportable, retake-able, A/B-comparable); kind `animation`, engine `remotion-local`, cost $0.
- **Acceptance criteria:**
  - GIVEN text + duration + AR WHEN rendered THEN an h264 mp4 of that duration (gated RUN_RENDER test).
  - GIVEN a shot WHEN ✦ Animate THEN kind `animation` enqueued and the result materializes as a take with target.shotId.
  - GIVEN mock mode THEN the video fixture substitutes (suite stays fast); cost is $0 in all modes.
- **Tests:** `tests/render.int.spec.ts` (real render, 11s) · real chain on dev DB (6s 356KB mp4 → take 7222 on Aurora "Logo out", visible in UI) · **Code:** `src/{TitleCard,Root,index,render}.tsx|ts`, gen executor animation branch, migration 0018, STB requestAnimationTake + materialize, ✦ UI · **Log:** LOG 2026-07-23
- **Deferred / notes:** more templates (kinetic text, lower-third) + AI template/props selection from prompt → follow-ups under this epic; UI submit verified wired (persistent extension click-drop documented in memory — chain verified server-side + result visible in browser).

*(002–003 elaborate when promoted; overlay mode composits Remotion layers over generated takes per remotion.dev/docs/layers + videos/transparency.)*
