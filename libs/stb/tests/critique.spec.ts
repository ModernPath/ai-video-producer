import { describe, expect, it } from "vitest";
import { CRITIQUE_LENSES, assembleCritiquePrompt, mergeCritiques, type Critique } from "../src/critique";
import { normalizePlannedShots } from "../src/plan-normalize";
import { styleCards } from "@avd/shared/config";

// USER 2026-07-27: "Maybe script planning could include some more iterations of adding critique
// steps from few angles and improve."
//
// The grader (REQ-STB-041) only catches what is mechanically checkable — framing repeats, a line
// that will not fit. It cannot tell you the film has no story, that a beat is unmotivated, or that
// the brand appears in a shot it has no business being in. Those need reading, from more than one
// seat: a continuity supervisor and an editor notice different faults in the same plan.
const plan = normalizePlannedShots({
  shots: [
    { title: "Office", durationS: 6, synopsis: "Pasi sits", shotSize: "WS", cast: ["Pasi"] },
    { title: "Logo", durationS: 4, synopsis: "end card", shotSize: "MS", cast: ["ModernPath"] },
  ],
});

describe("REQ-STB-051: a plan is critiqued from several angles, not one", () => {
  it("reads the plan from more than one seat", () => {
    expect(CRITIQUE_LENSES.length).toBeGreaterThanOrEqual(3);
  });

  it("gives each lens a distinct brief — identical readers are one reader", () => {
    const briefs = CRITIQUE_LENSES.map((l) => l.brief);
    expect(new Set(briefs).size).toBe(briefs.length);
  });

  it("covers the faults the user actually hit — pacing, continuity, and what is in frame", () => {
    const all = CRITIQUE_LENSES.map((l) => `${l.id} ${l.brief}`).join(" ").toLowerCase();
    expect(all).toMatch(/time|pacing|long/);
    expect(all).toMatch(/continuity|consistent/);
    expect(all).toMatch(/cast|on screen|in frame/);
  });

  it("asks each lens only for what it can see, in its own voice", () => {
    const p = assembleCritiquePrompt({ lens: CRITIQUE_LENSES[0]!, shots: plan, card: styleCards["cinematic-mood"]! });
    expect(p).toContain(CRITIQUE_LENSES[0]!.brief);
    expect(p).toMatch(/"issues"/);
  });

  it("puts the plan in the prompt so the critique is about THIS film", () => {
    expect(assembleCritiquePrompt({ lens: CRITIQUE_LENSES[0]!, shots: plan, card: undefined })).toContain("Office");
  });

  it("never leaks the reference a card was compiled from", () => {
    const card = { ...styleCards["cinematic-mood"]!, provenance: { brief: "like Aki Kaurismäki", references: ["Aki Kaurismäki"] } };
    expect(assembleCritiquePrompt({ lens: CRITIQUE_LENSES[0]!, shots: plan, card }).toLowerCase()).not.toContain("kaurism");
  });
});

describe("REQ-STB-051: merging what the lenses saw", () => {
  const critiques: Critique[] = [
    { lens: "pacing", issues: [{ shotTitle: "Office", severity: "error", note: "Six seconds for a man sitting still" }] },
    { lens: "continuity", issues: [{ shotTitle: "Office", severity: "warning", note: "No wardrobe stated" }] },
    { lens: "casting", issues: [{ shotTitle: "Logo", severity: "error", note: "Brand appears with no setup" }] },
  ];

  it("keeps every lens's issues — one reader must not silence another", () => {
    expect(mergeCritiques(critiques)).toHaveLength(3);
  });

  it("attributes each issue to the lens that raised it, so the notes are answerable", () => {
    expect(mergeCritiques(critiques).every((i) => i.lens)).toBe(true);
  });

  it("reads worst-first", () => {
    expect(mergeCritiques(critiques).map((i) => i.severity)).toEqual(["error", "error", "warning"]);
  });

  it("groups by shot so a shot with three complaints is obvious", () => {
    const merged = mergeCritiques([...critiques, { lens: "editor", issues: [{ shotTitle: "Office", severity: "error", note: "Dead beat" }] }]);
    expect(merged.filter((i) => i.shotTitle === "Office")).toHaveLength(3);
  });

  it("survives a lens that returned nothing", () => {
    expect(mergeCritiques([{ lens: "pacing", issues: [] }, ...critiques])).toHaveLength(3);
  });
});
