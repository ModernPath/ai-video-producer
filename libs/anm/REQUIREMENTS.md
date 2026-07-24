# ANM — Requirements Ledger

## Dashboard — ANM (Animations)
Totals: 3 DONE · 1 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 0 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-ANM-001 | Title-card animation takes (pure Remotion scenes) | P6 | DONE | USER Remotion epic 2026-07-23 | tests/render.int.spec.ts (RUN_RENDER) + real chain + browser | src/*, gen executor branch, migration 0018, ✦ Animate UI |
| REQ-ANM-002 | Animation overlays on generated shots | P6 | DONE | USER Remotion epic | anm render test (alpha webm) + stb overlay.int + real composite frame | LowerThird.tsx, composite.ts, executor overlay path, ✦ per-take UI |
| REQ-ANM-004 | Effects library (noise, light leaks, text highlights, …) | P6 | DONE | USER 2026-07-23 | render test + frame proof | src/effects.tsx, TitleCard composition, render prop passthrough |
| REQ-ANM-003 | Caption/lyric overlays from MM:SS transcripts (slices 1+2) | P6 | IN_REVIEW | USER Remotion epic + REQ-GEN-020 | render.int + asm/tests/animated-captions.int.spec.ts (full export) + captions.spec cues | Captions.tsx + asm transcriptToCues/captionStyle path + UI option |

### REQ-ANM-001 — Title-card animation takes
- **Status:** DONE · **Stage:** P6 · **Priority:** should · **Owner:** —
- **Raised-by:** USER 2026-07-23 ("generate separate scenes with purely remotion animations")
- **Source:** remotion.dev/docs/ssr-node; BACKLOG epic
- **Statement:** A shot can get a free animation take: the TitleCard template (brand-dark, spring-animated text + accent underline, fade-out) renders server-side at the shot's duration/aspect via Remotion and lands as a normal take (selectable, exportable, retake-able, A/B-comparable); kind `animation`, engine `remotion-local`, cost $0.
- **Acceptance criteria:**
  - GIVEN text + duration + AR WHEN rendered THEN an h264 mp4 of that duration (gated RUN_RENDER test).
  - GIVEN a shot WHEN ✦ Animate THEN kind `animation` enqueued and the result materializes as a take with target.shotId.
  - GIVEN mock mode THEN the video fixture substitutes (suite stays fast); cost is $0 in all modes.
- **Tests:** `tests/render.int.spec.ts` (real render, 11s) · real chain on dev DB (6s 356KB mp4 → take 7222 on Aurora "Logo out", visible in UI) · **Code:** `src/{TitleCard,Root,index,render}.tsx|ts`, gen executor animation branch, migration 0018, STB requestAnimationTake + materialize, ✦ UI · **Log:** LOG 2026-07-23
- **Deferred / notes:** more templates (kinetic text, lower-third) + AI template/props selection from prompt → follow-ups under this epic; UI submit verified wired (persistent extension click-drop documented in memory — chain verified server-side + result visible in browser).

### REQ-ANM-002 — Animation overlays on generated shots
- **Status:** DONE · **Stage:** P6 · **Priority:** should · **Owner:** —
- **Raised-by:** USER Remotion epic ("add an animation overlay to generated video scenes")
- **Source:** remotion.dev/docs/videos/transparency + layers
- **Statement:** Any take can receive a transparent Remotion overlay (LowerThird template: sliding accent-bar text, alpha VP8 webm) composited via ffmpeg (libvpx alpha decode, scale2ref) into a NEW take lineage-linked (`retake_of`) to its source — free and local; original take untouched.
- **Acceptance criteria:**
  - GIVEN a take WHEN overlaid THEN kind `animation` with the source video as editSourceAssetId ref and template lower-third in the snapshot.
  - GIVEN the composite THEN a new h264 take on the same shot with retake_of = source; audio passthrough.
  - GIVEN the render THEN the webm carries alpha (gated RUN_RENDER test).
- **Tests:** `tests/render.int.spec.ts` (alpha webm) · `libs/stb/tests/overlay.int.spec.ts` (mock chain: refs/lineage) · real E2E: overlay composited onto Aurora's real Veo take, frame extraction shows the lower-third over the footage · **Code:** `src/LowerThird.tsx`, `src/composite.ts`, executor overlay path, STB requestAnimationOverlay, per-take ✦ overlay UI · **Log:** LOG 2026-07-23
- **Deferred / notes:** greenscreen keying and multi-layer stacks later; overlay duration = source take duration (no offset control yet).

*(003 elaborates when promoted — caption overlays driven by REQ-GEN-020 transcripts; SRT-burned captions shipped as ASM-009 MVP.)*

### REQ-ANM-004 — Effects library
- **Status:** DONE · **Stage:** P6 · **Priority:** should · **Owner:** —
- **Raised-by:** USER 2026-07-23 (remotion.dev effect docs: transforms, effects, animation-math, noise-visualization, light-leaks, text-highlights, html-in-canvas)
- **Source:** the linked docs; props-not-code rule (docs/features/animations.md)
- **Statement:** Effect primitives compose into templates as parameterized props: noise-driven drifting LightLeaks (screen-blended, @remotion/noise), FilmGrain (SVG turbulence with per-frame seed shimmer), Highlight (animated sweep behind a chosen word). TitleCard defaults to leak+grain (subtle film look pairing with the Golden Hour style); `highlightWord` opts into the sweep; render passes arbitrary effect props through inputProps.
- **Acceptance criteria:**
  - GIVEN the title template with effects THEN it renders (gated RUN_RENDER test) and the frame shows leaks/grain/highlight (visual proof).
  - GIVEN effect props off THEN a clean render (defaults overridable).
- **Tests:** `tests/render.int.spec.ts` (effects case) + frame extraction proof · **Code:** `src/effects.tsx`, TitleCard composition, `src/render.ts` prop passthrough, dep @remotion/noise · **Log:** LOG 2026-07-23
- **Deferred / notes:** remaining primitives — transforms suite, html-in-canvas compositions, effects on LowerThird — follow-up slices under this REQ before DONE.

### REQ-ANM-003 — Caption/lyric overlays from MM:SS transcripts
- **Status:** IN_REVIEW  ·  **Stage:** P6  ·  **Priority:** should  ·  **Owner:** —
- **Raised-by:** USER Remotion epic 2026-07-23 (captions pair with REQ-GEN-020 transcripts)
- **Source:** docs/features/animations.md; REQ-ANM-002 alpha-composite recipe
- **Statement (slice 1):** A `captions` Remotion template renders cue-timed animated caption lines ({startS,endS,text}[] props — spring pop-in, fade-out, bottom pill) as a transparent alpha webm, composable onto any take/export via the existing compositeOverlay.
- **Acceptance criteria (slice 1):**
  - GIVEN cues over a 6s duration THEN renderAnimation(template:"captions") returns an alpha webm of that duration (RUN_RENDER test).
  - GIVEN a real take THEN the composite shows the cue rendered at its window (frame-proofed on the KAIJU alley shot).
- **Tests:** `tests/render.int.spec.ts` REQ-ANM-003 block + composite frame proof · **Code:** `src/Captions.tsx`, `src/Root.tsx`, `src/render.ts` (template union + transparent set) · **Log:** LOG 2026-07-24
- **Slice 2 (same day):** `transcriptToCues` is the single timing source (SRT derives from it — timings can't drift); `createSnapshot` accepts `captionStyle:"animated"`; the export's caption pass renders the Captions overlay and composites it over the cut instead of the libass burn; UI gained "captions: lyrics · animated"; driver export stage takes a captions arg. Evidence: gated full-export int test (mock take + early lyric line → composited final) + real harbor export exercising the honest empty-cues fallthrough (its transcript is section-labels only).
- **Deferred / notes:** per-take overlay UI; word-level karaoke timing (needs word timestamps).
