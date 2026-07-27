import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// REQ-STB-045 — USER 2026-07-26: "for some reason the image prompt is not retained, so I could
// actually generate alternative images if I'm not happy?" Focused on shot 15 (Synchronized Drink),
// the IMAGE SCRIPT box showed shot 7's title-card text.
//
// Cause: the stage renders ONE panel at a time (`stagePanels[focus]` in Workspace) and every panel
// has the same element shape. React reconciles them as the same element, keeps the existing DOM
// nodes, and `defaultValue` is an UNCONTROLLED initial value applied only on mount — so switching
// shots left the previous shot's text in the box, and saving would have written it to the wrong
// shot and generated a paid frame from it.
//
// UPDATED 2026-07-27 (REQ-STB-060/061). This spec used to justify itself: "there is nothing to
// render in a unit test" — the panel was 439 lines of JSX inside a loop inside an async server
// component that reads the database. That premise is now false: the panel takes no database, and
// `stage-panel.render.spec.tsx` renders it and reads the DOM. These source assertions remain only
// as cheap guards on where the mechanism is written.
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const page = read("apps/web/app/p/[id]/page.tsx");
const panel = read("apps/web/app/p/[id]/panels/StagePanel.tsx");

describe("REQ-STB-045: each shot's stage panel has its own React identity", () => {
  // CORRECTED 2026-07-27. This used to assert the key on <StagePanel> in page.tsx, and to claim
  // the defect was unreachable by a render test. Both were wrong, and mutation testing proved it:
  // removing the OUTER key changes nothing, because the panel's own root carries the key and that
  // is what forces the remount. `stage-panel.render.spec.tsx` now covers the behaviour properly —
  // these remain as cheap source guards on the two places the mechanism lives.
  it("the panel ROOT is keyed by shot id — this is the load-bearing one", () => {
    expect(panel, "StagePanel's root <div> must carry key={props.shot.id}; without it React reuses the previous shot's DOM")
      .toMatch(/<div key=\{props\.shot\.id\}/);
  });

  it("the page also keys the element, belt and braces", () => {
    const assignment = page.slice(page.indexOf("stagePanels[s.id] = ("));
    expect(assignment.slice(0, assignment.indexOf("/>") + 2)).toMatch(/key=\{s\.id\}/);
  });

  it("still uses uncontrolled defaults for the prompt boxes, which is what makes the key load-bearing", () => {
    expect(panel).toMatch(/name="imagePrompt"[\s\S]{0,140}defaultValue=\{props\.shot\.imagePrompt/);
    expect(panel).toMatch(/name="videoPrompt"[\s\S]{0,140}defaultValue=\{props\.shot\.videoPrompt/);
  });

  it("the panel is a component with explicit props — the precondition for rendering it (REQ-STB-060)", () => {
    expect(panel).toMatch(/export function StagePanel\(props: StagePanelProps\)/);
    expect(panel).not.toMatch(/from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/db"/);
    expect(panel).not.toMatch(/\bawait db\(/);
  });
});
