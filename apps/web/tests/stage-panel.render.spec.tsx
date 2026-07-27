// @vitest-environment jsdom
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
// USER 2026-07-26: "for some reason the image prompt is not retained, so I could actually generate
// alternative images if I'm not happy? Now having two Pasi's drinking is not what I was after."
// Focused on shot 15, the IMAGE SCRIPT box showed shot 7's text — and saving would have written it
// to the wrong shot and bought a paid frame from it.
//
// The stage swaps ONE panel in place and every panel has the same element shape, so React reuses
// the DOM. `defaultValue` is an UNCONTROLLED initial value applied only on mount, so the previous
// shot's text survives. The fix is identity: the panel ROOT carries `key={props.shot.id}`, which
// makes a shot swap unmount and remount the subtree.
//
// Mutation-verified: delete that key and both tests below fail — the second reports the previous
// shot's edited text, which is precisely the user's report. An earlier version of this spec mutated
// the OUTER key in page.tsx instead and passed either way, because the inner key was doing the work.
describe("REQ-STB-045: switching shots does not carry the previous shot's prompt text", () => {
  const panel = (shot: ReturnType<typeof aShot>) => <StagePanel {...stagePanelProps({ shot, shots: [shot] })} />;
  const promptBox = (c: HTMLElement) => c.querySelector('[name="imagePrompt"]') as HTMLTextAreaElement;
  const shotA = () => aShot({ id: "shot-a", imagePrompt: "a tram at dusk, wide" });
  const shotB = () => aShot({ id: "shot-b", imagePrompt: "a cafe interior, close" });

  it("remounts the prompt box rather than reusing the previous shot's DOM node", () => {
    const { container, rerender } = render(<div>{panel(shotA())}</div>);
    const before = promptBox(container);
    rerender(<div>{panel(shotB())}</div>);
    expect(promptBox(container), "a reused node keeps the previous shot's text").not.toBe(before);
  });

  it("drops text the user had TYPED into the previous shot — the case that lost real work", () => {
    const { container, rerender } = render(<div>{panel(shotA())}</div>);
    promptBox(container).value = "MY UNSAVED EDIT"; // uncontrolled: the DOM now diverges from props
    rerender(<div>{panel(shotB())}</div>);
    expect(promptBox(container).value, "shot A's edited text must not appear in shot B's box")
      .toBe("a cafe interior, close");
  });
});

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
