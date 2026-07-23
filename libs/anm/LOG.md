# ANM — Build Log

## 2026-07-23 — REQ-ANM-001 title-card animation takes (→ IN_REVIEW)
**Done:** new ANM context: Remotion 4 render engine (bundle cached per process; ~11s first render incl. webpack; local Chrome), TitleCard template (props only — no AI-generated code), gen kind `animation` (migration 0018, engine remotion-local, $0), executor branch (mock fixture in tests), STB requestAnimationTake → materializes as a normal take, ✦ Animate · free UI on every shot. Real chain verified: 6s 356KB h264 take on Aurora "Logo out", visible in the takes lane with select/retake/A-B affordances.
**Decisions:** templates are parameterized components — the model supplies props, never code (safety + determinism); animation counts against the take lane lockout; Remotion native packages kept external to the Next bundle.
**Deferred:** REQ-ANM-002 overlays (layers/transparency/greenscreen), REQ-ANM-003 caption/lyric overlays (pairs with REQ-GEN-020 transcripts).
**Discovered:** Next tried to bundle @remotion platform binaries → serverExternalPackages fix; browser-extension submit-drop hit repeatedly this session (documented in memory) — server-side verification + UI-visible result used as evidence.
**Follow-ups:** more templates; AI prompt → template+props selection.
**Gate:** full suite green (114 passed, RUN_RENDER gated test 1/1); real chain verified.
