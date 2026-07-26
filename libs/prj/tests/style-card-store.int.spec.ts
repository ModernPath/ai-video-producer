import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { styleCards } from "@avd/shared/config";
import type { StyleCard } from "@avd/shared/contracts";
import { getProjectStyleCard, setProjectArchetype, setProjectStyleCard, setProjectTargetDuration } from "../src/service";
import { project } from "../src/schema";

// SR-DIR-008 (EPIC-STB-001, USER 2026-07-26: "how do I test my Kaurismäki shortfilm?" — the
// directing picker offered only the six built-ins, so a compiled brief had nowhere to live).
const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

const card: StyleCard = {
  id: "compiled-x", name: "Deadpan northern comedy",
  provenance: { brief: "a film directed by Aki Kaurismäki", references: ["Aki Kaurismäki"] },
  structure: { arc: "flat affect" },
  camera: { allowedMovements: ["static"], preferredSizes: ["MW"], angles: ["eye"], notes: "Locked off." },
  pacing: { durationWindowS: [6, 8] },
  palette: { accent: "#c8202a", background: "#4a4a32", notes: "Saturated primaries on drab olive." },
  light: "Hard practical sources.", performance: "Deadpan.", humour: "Understatement.",
  sound: "Sparse.", typography: "Plain.", antiNotes: ["no handheld"],
  defaults: { audioMode: "mix" },
};

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Card Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Card", aspectRatio: "16:9", targetDurationS: "60",
  });
});

afterAll(async () => {
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

// REQ-PRJ-006 (USER 2026-07-26: "it's only 30seconds instead of minute that I was asking for").
describe("REQ-PRJ-006: the film's runtime is settable", () => {
  it("sets the runtime the user asked for", async () => {
    await setProjectTargetDuration(db, { projectId, targetDurationS: 60 });
    const [p] = await db.select().from(project).where(eq(project.id, projectId));
    expect(Number(p!.targetDurationS)).toBe(60);
  });

  it("clamps rather than storing a runtime the product cannot build", async () => {
    await setProjectTargetDuration(db, { projectId, targetDurationS: 99999 });
    const [long] = await db.select().from(project).where(eq(project.id, projectId));
    expect(Number(long!.targetDurationS)).toBe(300);
    await setProjectTargetDuration(db, { projectId, targetDurationS: 1 });
    const [short] = await db.select().from(project).where(eq(project.id, projectId));
    expect(Number(short!.targetDurationS)).toBe(5);
    await setProjectTargetDuration(db, { projectId, targetDurationS: 60 });
  });
});

describe("REQ-PRJ-013: a compiled Style Card is stored on the project", () => {
  it("returns nothing before one is set", async () => {
    expect(await getProjectStyleCard(db, projectId)).toBeNull();
  });

  it("stores and reads back a compiled card, provenance intact for the UI", async () => {
    await setProjectStyleCard(db, { projectId, card });
    const back = await getProjectStyleCard(db, projectId);
    expect(back?.name).toBe("Deadpan northern comedy");
    expect(back?.provenance.references).toEqual(["Aki Kaurismäki"]);
    expect(back?.camera.allowedMovements).toEqual(["static"]);
  });

  it("applies the card's audio-mode default, as selecting a seed does", async () => {
    const [p] = await db.select().from(project).where(eq(project.id, projectId));
    expect(p!.audioMixMode).toBe("mix");
  });

  it("marks the project as using a compiled card rather than a seed key", async () => {
    const [p] = await db.select().from(project).where(eq(project.id, projectId));
    expect(p!.archetype).toBeNull(); // a compiled card is not one of the six keys
  });

  it("rejects a card that does not satisfy the contract", async () => {
    const bad = { ...card, antiNotes: undefined } as unknown as StyleCard;
    await expect(setProjectStyleCard(db, { projectId, card: bad })).rejects.toThrow();
  });

  it("keeps the stored card when an unrelated field is updated", async () => {
    await db.update(project).set({ title: "Card renamed" }).where(eq(project.id, projectId));
    expect((await getProjectStyleCard(db, projectId))?.name).toBe("Deadpan northern comedy");
  });

  it("is replaced — not merged — when a new brief is compiled", async () => {
    await setProjectStyleCard(db, { projectId, card: { ...card, name: "Second compile", antiNotes: ["no zooms"] } });
    const back = await getProjectStyleCard(db, projectId);
    expect(back?.name).toBe("Second compile");
    expect(back?.antiNotes).toEqual(["no zooms"]);
  });

  // USER 2026-07-26: their compiled card vanished. The picker renders `defaultValue={p.archetype ?? ""}`
  // — "freeform" — even while a compiled card is active, so pressing Set on what looks like the
  // current state wiped it. Choosing a real archetype is a deliberate replacement; choosing
  // freeform must not destroy a compiled card as a side effect of a misleading control.
  it("does NOT clear a compiled card when the picker is set to freeform", async () => {
    await setProjectStyleCard(db, { projectId, card });
    await setProjectArchetype(db, { projectId, archetype: null });
    expect((await getProjectStyleCard(db, projectId))?.name).toBe("Deadpan northern comedy");
  });

  it("clears the compiled card when a built-in archetype is chosen instead", async () => {
    await setProjectArchetype(db, { projectId, archetype: "cinematic-mood" });
    expect(await getProjectStyleCard(db, projectId)).toBeNull();
    const [p] = await db.select().from(project).where(eq(project.id, projectId));
    expect(p!.archetype).toBe("cinematic-mood");
  });

  it("still resolves the seed card for that archetype", () => {
    expect(styleCards["cinematic-mood"]!.pacing.durationWindowS).toEqual([8, 8]);
  });
});
