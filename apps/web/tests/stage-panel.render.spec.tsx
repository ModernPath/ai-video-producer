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

// REQ-STB-067 — the chain button's LABEL, because it has shipped wrong twice.
//
// REQ-STB-060 extracted this panel by prefixing identifiers, which corrupted seven pieces of
// user-visible text ('use whole cast' → 'use whole props.cast'). Those seven were fixed; two more
// survived unnoticed until the user read them on the deployed app (2026-07-28): the button said
// "Generate the props.chain (10 props.shots)". Nothing tested rendered text, so nothing could
// catch it. This does.
describe("REQ-STB-067: the chain button says what a person would say", () => {
  const prevShot = () => aShot({ id: "shot-prev", title: "Shot before" });
  const headOfChain = (over = {}) =>
    stagePanelProps({
      shot: aShot({ id: "shot-head" }),
      shots: [prevShot(), aShot({ id: "shot-head" })],
      index: 1,
      chain: { headId: "shot-head", length: 10, index: 0 } as never,
      ...over,
    });

  it("names shots and the chain in English", () => {
    const { container } = render(<StagePanel {...headOfChain()} />);
    expect(container.textContent ?? "").toContain("Generate the chain (10 shots)");
  });

  it("leaks no prop path into anything the user reads", () => {
    // container.textContent covers every rendered string, which is the point: the three that
    // shipped were a button label, a count, and a sentence inside a <span>.
    const { container } = render(<StagePanel {...headOfChain()} />);
    expect(container.textContent ?? "").not.toMatch(/props\./);
  });

  it("...including the stale-handoff warning, which was corrupted too", () => {
    const { container } = render(
      <StagePanel {...headOfChain({ shot: aShot({ id: "shot-head", continuesFromShotId: "shot-prev" }), handoff: "stale" })} />
    );
    expect(container.textContent ?? "").toMatch(/the handoff will not overwrite one you chose/);
    expect(container.textContent ?? "").not.toMatch(/props\./);
  });
});

// REQ-GEN-036 — the same corruption class, found by the user a THIRD time (2026-07-28):
// the failure banner read "take props.failed · output_unusable".
//
// The REQ-STB-067 guard above already asserted `textContent` carries no "props.", and it passed —
// because it renders ONE state, and a shot with no failed take never renders the banner. A guard
// that only visits the happy path only guards the happy path. This walks the states instead.
describe("REQ-GEN-036: no rendered state leaks a prop path", () => {
  const failed = (over = {}) =>
    new Map([["shot-x", { id: "gen-1", kind: "take", errorCode: "content_policy", errorDetail: "blocked by the provider's content filter — Person/Face generation blocked", target: {}, ...over }]]);

  const STATES: Array<[string, Parameters<typeof stagePanelProps>[0]]> = [
    ["a failed take", { shot: aShot({ id: "shot-x" }), failedByShot: failed() as never }],
    ["a failed take on a sub-clip", { shot: aShot({ id: "shot-x", continuesFromShotId: "shot-w" }), handoff: "stale", failedByShot: failed() as never }],
    ["a shot mid-generation", { shot: aShot({ id: "shot-x" }), busy: { frame: 1, take: 1 } }],
    ["a blocked chain member", { shot: aShot({ id: "shot-x", continuesFromShotId: "shot-w" }), blocked: "Continues Shot W — generate and choose that take first." as never }],
    ["a shot with custom prompts", { shot: aShot({ id: "shot-x", imagePrompt: "img", videoPrompt: "vid" }) }],
    ["a plain shot", {}],
  ];

  for (const [name, over] of STATES) {
    it(`${name} reads as English`, () => {
      const { container } = render(<StagePanel {...stagePanelProps(over)} />);
      expect(container.textContent ?? "", `a prop path reached the screen in: ${name}`).not.toMatch(/props\./);
    });
  }

  it("the failure banner names the kind and the code, not the props object", () => {
    const { container } = render(<StagePanel {...stagePanelProps({ shot: aShot({ id: "shot-x" }), failedByShot: failed() as never })} />);
    expect(container.textContent ?? "").toMatch(/take failed · content_policy/);
  });
});
