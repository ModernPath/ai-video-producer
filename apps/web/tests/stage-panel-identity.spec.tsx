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
// UPDATED 2026-07-27 (REQ-STB-060). This spec used to justify itself: "there is nothing to render
// in a unit test" — the panel was 439 lines of JSX inside a loop inside an async server component
// that reads the database. That premise is now FALSE: the panel is `<StagePanel {...props} />` and
// takes no database. These assertions still read source because they guard WHERE a value is
// written, but REQ-STB-061 replaces them with a test that renders the component and reads the DOM,
// which is the assertion that would actually have caught the bug.
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const page = read("apps/web/app/p/[id]/page.tsx");
const panel = read("apps/web/app/p/[id]/panels/StagePanel.tsx");

describe("REQ-STB-045: each shot's stage panel has its own React identity", () => {
  it("keys the panel by shot id, so switching shots remounts the prompt boxes", () => {
    const assignment = page.slice(page.indexOf("stagePanels[s.id] = ("));
    const element = assignment.slice(0, assignment.indexOf("/>") + 2);
    expect(element, "the <StagePanel> element must carry key={s.id} — without it React reuses the previous shot's DOM and its prompt text")
      .toMatch(/key=\{s\.id\}/);
  });

  it("still uses uncontrolled defaults for the prompt boxes, which is what makes the key load-bearing", () => {
    // If these ever become controlled inputs the key stops being the mechanism, and this guard
    // should be revisited rather than silently left in place.
    expect(panel).toMatch(/name="imagePrompt"[\s\S]{0,140}defaultValue=\{props\.shot\.imagePrompt/);
    expect(panel).toMatch(/name="videoPrompt"[\s\S]{0,140}defaultValue=\{props\.shot\.videoPrompt/);
  });

  it("the panel is a component with explicit props — the precondition for rendering it (REQ-STB-060)", () => {
    expect(panel).toMatch(/export function StagePanel\(props: StagePanelProps\)/);
    // It must not reach for the database itself; that is what keeps it renderable in a test.
    expect(panel).not.toMatch(/from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/db"/);
    expect(panel).not.toMatch(/\bawait db\(/);
  });
});
