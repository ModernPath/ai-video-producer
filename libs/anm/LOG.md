# ANM — Build Log

## 2026-07-24 — KineticText word-gap fix (production finding)
**Done:** "KAIJU Neon Nights" full production showed kinetic words fused ("WAKETHECITY"): the flex container's `gap: 0.6em` resolved against the container's default 16px font while glyphs were 130px. fontSize moved to the container (spans inherit) so the em gap tracks glyph size; 0.35em reads right at all scales. Verified by $0 re-render ("WAKE THE CITY" correct) + RUN_RENDER ring 4/4.
**Decisions:** gap tightened 0.6→0.35em at the new (correct) scale — 0.6em of a 130px font was too airy.
**Deferred / Discovered / Follow-ups:** none. **Gate:** render ring green.

## 2026-07-23 — ANM-004 slice 2: KineticText (transforms) + template selection
**Done:** KineticText template — sequential word pops via @remotion/animation-utils makeTransform (translateY+scale+alternating rotate) with spring physics, every third word accent-colored, effects composed; registered + render map; template choice plumbed STB→executor→UI (title/kinetic select beside ✦ Animate). Gated renders 4/4; frame proof (word spacing polished after review). Covers the transforms + animation-math docs; html-in-canvas remains the last deferred primitive.
**Decisions:** template select defaults to title; kinetic reserved for explicit choice (and future archetype recipes per docs/87).
**Deferred:** html-in-canvas; LowerThird effects.
**Discovered:** USER filed the directing/taste epic mid-tick → docs/87-directing-playbook.md + REQ-STB-026..028.
**Follow-ups:** archetype recipes will select templates automatically.
**Gate:** full suite green (126 passed); RUN_RENDER 4/4.

## 2026-07-23 — REQ-ANM-004 effects library, first slice (→ IN_REVIEW)
**Done:** src/effects.tsx — LightLeaks (two noise2D-driven radial glows, screen blend, accent-tinted), FilmGrain (feTurbulence, 7-seed shimmer, 0.07 opacity), Highlight (animated sweep behind a word, text-highlights pattern). TitleCard composes them (defaults on, overridable) + highlightWord; render.ts forwards arbitrary effect props. Gated render 3/3; visual frame proof: leaks + grain + completed KAIJU highlight sweep.
**Decisions:** effect defaults ON for title (tasteful film look, pairs with Golden Hour) — overridable per render; effects are components, props only.
**Deferred:** transforms suite, html-in-canvas, LowerThird effects (stay under ANM-004 before DONE).
**Discovered:** —
**Follow-ups:** —
**Gate:** full suite green; RUN_RENDER 3/3.

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
