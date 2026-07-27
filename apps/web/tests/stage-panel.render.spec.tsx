// @vitest-environment happy-dom
// REQ-STB-061 — the three UI defects that reached the user, as tests that RENDER.
//
// `docs/88-architecture-review.md` §4b. Every one of these shipped with a green suite, because the
// suite asserted that the code building the panel existed and never asserted what the panel showed.
// Each test below is written from the user's report, and each asserts the DOM.
//
// The harness itself is the general fix; these three are the specific escapes.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StagePanel } from "../app/p/[id]/panels/StagePanel";
import { aShot, stagePanelProps } from "./fixtures/stage-panel";

afterEach(cleanup);

// USER 2026-07-26: "for some reason the image prompt is not retained, so I could actually generate
// alternative images if I'm not happy? Now having two Pasi's drinking is not what I was after."
//
// The stage swaps ONE panel in place. Every panel has the same element shape, so without a key
// React reconciles them as the same element, keeps the DOM, and `defaultValue` — an UNCONTROLLED
// initial value applied only on mount — never re-applies. The previous shot's text stays in the
// box, and saving writes it to the wrong shot and buys a frame from it.
// The panel renders each shot's own text — necessary, but NOT the REQ-STB-045 guard. See below.
describe("REQ-STB-045: the panel renders the shot it was given", () => {
  const panelFor = (shot: ReturnType<typeof aShot>) => (
    <StagePanel key={shot.id} {...stagePanelProps({ shot, shots: [shot] })} />
  );
  const promptBox = (c: HTMLElement) => c.querySelector('[name="imagePrompt"]') as HTMLTextAreaElement;

  it("puts this shot's image prompt in the box", () => {
    const { container } = render(<div>{panelFor(aShot({ id: "shot-a", imagePrompt: "a tram at dusk, wide" }))}</div>);
    expect(promptBox(container).value).toBe("a tram at dusk, wide");
  });

  it("shows the new shot's prompt after a swap", () => {
    const { container, rerender } = render(<div>{panelFor(aShot({ id: "shot-a", imagePrompt: "a tram at dusk, wide" }))}</div>);
    rerender(<div>{panelFor(aShot({ id: "shot-b", imagePrompt: "a cafe interior, close" }))}</div>);
    expect(promptBox(container).value).toBe("a cafe interior, close");
  });
});

// HONEST LIMIT — the REQ-STB-045 defect is NOT covered by this harness, and these two tests do not
// cover it either. Both still pass with `key={shot.id}` REMOVED; so did two earlier versions of
// them, including one that compared node identity across the swap.
//
// Two reasons, both measured rather than assumed:
//   1. happy-dom does not implement the DOM "dirty value flag", so an uncontrolled box appears to
//      re-read its defaultValue even when React keeps the node — the exact thing that did NOT
//      happen in the user's browser.
//   2. Testing Library's `rerender` produced a fresh element here with and without the key, so the
//      reconciliation-reuse the bug depended on never occurs.
//
// The guard for REQ-STB-045 therefore remains the source-level assertion in
// `stage-panel-identity.spec.tsx`, which fails if `key={s.id}` is removed from page.tsx. Reproducing
// it faithfully needs a real browser (Playwright), which is a bigger decision than this row —
// recorded as a follow-up rather than papered over with a test that goes green either way.

// USER 2026-07-27: sub-clips were buying start frames the handoff then discarded — on the user's own
// project, 5 of 10 shots, every one wasted. REQ-STB-057 hid the control; REQ-STB-062 made the
// service refuse it. This asserts the panel does not OFFER it.
describe("REQ-STB-057: a sub-clip is not offered a start frame to buy", () => {
  it("says the frame comes from the previous take instead of selling one", () => {
    render(<StagePanel {...stagePanelProps({ shot: aShot({ continuesFromShotId: "shot-0" }), handoff: "current" })} />);
    expect(screen.getByText(/start frame comes from the previous take — no frames to buy/i)).toBeDefined();
  });

  it("a shot that is NOT a sub-clip still gets the control (positive control)", () => {
    render(<StagePanel {...stagePanelProps({ shot: aShot({ continuesFromShotId: null }) })} />);
    expect(screen.queryByText(/no frames to buy/i), "a chain head must still be able to buy its first frame").toBeNull();
  });
});

// USER 2026-07-27: "In my other video, there was already a generated image, so I can't actually go
// to real last frame of previous video." The automatic handoff refuses to overwrite an existing
// frame, so the panel could claim a start frame came from the previous take when it did not.
describe("REQ-STB-058: the panel tells the truth about where the start frame came from", () => {
  it("says NOT from the previous take when the handoff is stale", () => {
    render(<StagePanel {...stagePanelProps({ shot: aShot({ continuesFromShotId: "shot-0" }), handoff: "stale" })} />);
    expect(screen.getByText(/NOT from the previous take yet/i)).toBeDefined();
  });

  it("only claims the handover when it actually happened", () => {
    render(<StagePanel {...stagePanelProps({ shot: aShot({ continuesFromShotId: "shot-0" }), handoff: "current" })} />);
    expect(screen.getByText(/handed over from the previous take/i)).toBeDefined();
    expect(screen.queryByText(/NOT from the previous take yet/i)).toBeNull();
  });
});
