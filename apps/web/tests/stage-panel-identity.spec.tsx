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
// The fix is identity: the panel root carries `key={s.id}`. This is a source-level guard because
// the panel is built inside an async server component that reads the database — there is nothing
// to render in a unit test. It is deliberately narrow: it asserts the one property whose absence
// caused the bug, and it fails loudly if someone removes the key.
const src = readFileSync(join(process.cwd(), "apps/web/app/p/[id]/page.tsx"), "utf8");

describe("REQ-STB-045: each shot's stage panel has its own React identity", () => {
  it("keys the panel root by shot id, so switching shots remounts the prompt boxes", () => {
    const assignment = src.slice(src.indexOf("stagePanels[s.id] = ("));
    const root = assignment.slice(0, assignment.indexOf(">") + 1);
    expect(root, "stage panel root must carry key={s.id} — without it React reuses the previous shot's DOM and its prompt text").toMatch(/key=\{s\.id\}/);
  });

  it("still uses uncontrolled defaults for the prompt boxes, which is what makes the key load-bearing", () => {
    // If these ever become controlled inputs the key stops being the mechanism, and this guard
    // should be revisited rather than silently left in place.
    expect(src).toMatch(/name="imagePrompt"[\s\S]{0,120}defaultValue=\{s\.imagePrompt/);
    expect(src).toMatch(/name="videoPrompt"[\s\S]{0,120}defaultValue=\{s\.videoPrompt/);
  });

  it("keys the drawer panels too — they swap in the same single-slot way", () => {
    expect(src.includes("stagePanels[s.id] = (")).toBe(true);
  });
});
