# ANM — Build Log

## 2026-07-23 — REQ-ANM-002 overlays on generated takes (→ IN_REVIEW)
**Done:** LowerThird transparent template (spring slide-in, accent bar, fade-out) rendered as alpha VP8 webm (imageFormat png + yuva420p); compositeOverlay via dockerized ffmpeg (libvpx decode preserves alpha; scale2ref sizes overlay to base; audio passthrough); executor overlay path (source bytes via editSourceAssetId ref); STB requestAnimationOverlay → new take with retake_of lineage; per-take "overlay text… ✦" UI. Real E2E: composited onto Aurora's real Veo pour shot — extracted frame shows the animated lower-third over the footage.
**Decisions:** overlay output is a NEW take (original preserved, A/B-comparable with its source via the existing lineage machinery).
**Deferred:** greenscreen keying, multi-layer stacks, overlay timing offsets.
**Discovered:** vp8+yuva420p+png imageFormat is the working alpha recipe with jrottenberg/ffmpeg 6.1 libvpx.
**Follow-ups:** ANM-003 full (animated caption overlays from transcripts).
**Gate:** full suite green (121 passed); RUN_RENDER 2/2; visual frame verification.

## 2026-07-23 — REQ-ANM-001 title-card animation takes (→ IN_REVIEW)
**Done:** new ANM context: Remotion 4 render engine (bundle cached per process; ~11s first render incl. webpack; local Chrome), TitleCard template (props only — no AI-generated code), gen kind `animation` (migration 0018, engine remotion-local, $0), executor branch (mock fixture in tests), STB requestAnimationTake → materializes as a normal take, ✦ Animate · free UI on every shot. Real chain verified: 6s 356KB h264 take on Aurora "Logo out", visible in the takes lane with select/retake/A-B affordances.
**Decisions:** templates are parameterized components — the model supplies props, never code (safety + determinism); animation counts against the take lane lockout; Remotion native packages kept external to the Next bundle.
**Deferred:** REQ-ANM-002 overlays (layers/transparency/greenscreen), REQ-ANM-003 caption/lyric overlays (pairs with REQ-GEN-020 transcripts).
**Discovered:** Next tried to bundle @remotion platform binaries → serverExternalPackages fix; browser-extension submit-drop hit repeatedly this session (documented in memory) — server-side verification + UI-visible result used as evidence.
**Follow-ups:** more templates; AI prompt → template+props selection.
**Gate:** full suite green (114 passed, RUN_RENDER gated test 1/1); real chain verified.
