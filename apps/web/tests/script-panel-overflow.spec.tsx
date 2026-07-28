// @vitest-environment happy-dom
// REQ-STB-065 (USER 2026-07-28) — the Script drawer's "Set" buttons must stay inside the panel.
//
// Seen on the deployed app: with a compiled card active, the directing picker's option reads
// "directing: ✦ Glam Metal Visual Aesthetic (compiled)". The select is `flex: 1`, but a flex item
// defaults to `min-width: auto`, which means it refuses to shrink below its CONTENT width — so the
// long label pushed the "Set" button past the 400px drawer edge and clipped it to "Se". The control
// was unreachable at the default width and fine in wide mode, which is why it survived review.
//
// This asserts the two properties that make the row shrinkable, on the rendered output rather than
// on the source: the growing control may shrink, and the button may not.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { styleCards } from "@avd/shared/config";
import { ScriptPanel } from "../app/p/[id]/panels/ScriptPanel";

afterEach(cleanup);

const p = {
  id: "proj-1", organizationId: "org-1", title: "Test", aspectRatio: "16:9",
  targetDurationS: "50", brief: { idea: "a film" }, audioMixMode: null, archetype: null,
  createdAt: new Date("2026-07-28T00:00:00Z"),
} as never;

/**
 * A compiled card gives the picker its longest possible label — the case that overflowed.
 *
 * Built from a REAL card in shipped config rather than a hand-written literal: the panel renders
 * the whole card below the picker, so a partial fixture makes this spec go red on a missing
 * property instead of on the layout it exists to pin. (It did, twice, while this was written.)
 */
const projectCard = {
  ...Object.values(styleCards)[0]!,
  name: "Glam Metal Visual Aesthetic",
} as never;

function renderPanel() {
  return render(
    <ScriptPanel
      p={p}
      planBlocker={null}
      activeKinds={new Set()}
      briefIdea="a film"
      cast={[] as never}
      id="proj-1"
      lastFailure={undefined}
      latestScript={undefined}
      music={null as never}
      projectCard={projectCard}
      proposals={[]}
      shots={[] as never}
      versions={[]}
    />
  );
}

describe("REQ-STB-065: the Script drawer's rows shrink instead of clipping their button", () => {
  it("the directing picker may shrink below its content width", () => {
    const { container } = renderPanel();
    const select = container.querySelector<HTMLSelectElement>('select[name="archetype"]');
    expect(select).not.toBeNull();
    // Without this the select's min-width is its longest option, and everything after it is pushed
    // out of the drawer.
    expect(select!.style.minWidth).toBe("0");
  });

  it("the directing row's Set button may not shrink", () => {
    const { container } = renderPanel();
    const form = container.querySelector<HTMLFormElement>('select[name="archetype"]')!.closest("form")!;
    const button = form.querySelector("button")!;
    expect(button.textContent).toBe("Set");
    expect(button.style.flexShrink).toBe("0");
  });

  it("the runtime row's caption shrinks and its Set button does not", () => {
    const { container } = renderPanel();
    const form = container.querySelector<HTMLInputElement>('input[name="seconds"]')!.closest("form")!;
    const caption = form.querySelector<HTMLSpanElement>("span")!;
    expect(caption.textContent).toContain("what the shot plan aims for");
    expect(caption.style.minWidth).toBe("0");
    const button = form.querySelector("button")!;
    expect(button.textContent).toBe("Set");
    expect(button.style.flexShrink).toBe("0");
  });
});
