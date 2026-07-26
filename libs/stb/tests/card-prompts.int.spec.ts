import { desc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { setProjectStyleCard } from "@avd/prj/service";
import type { StyleCard } from "@avd/shared/contracts";
import { createShot, requestFrame, requestTake } from "../src/service";
import { shot } from "../src/schema";

// USER 2026-07-26, looking at real output: "styling was not held in the images… also character
// clothing changes". Root cause: `assembleFramePrompt` accepted a `card` (REQ-GEN-026) but nothing
// ever passed one, so the look reached a frame only if the planner happened to write it into that
// shot's imagePrompt. Shot 2 of their film came back as a cartoon.
const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

const card: StyleCard = {
  id: "compiled-deadpan", name: "Static Retro Deadpan",
  provenance: { brief: "in the style of Aki Kaurismäki", references: ["Aki Kaurismäki"] },
  structure: { arc: "flat affect" },
  camera: { allowedMovements: ["static"], preferredSizes: ["MS"], angles: ["eye"], notes: "Locked-off symmetrical framing." },
  pacing: { durationWindowS: [5, 9] },
  palette: { accent: "#c82323", background: "#2d3a45", notes: "Muted slate against saturated crimson." },
  light: "Hard directional tungsten key.",
  performance: "Deadpan, motionless.",
  humour: "Laconic and dry.",
  sound: "Diegetic radio.",
  typography: "Plain.",
  continuity: "Pasi wears the same grey wool suit and knitted tie in every shot.",
  antiNotes: ["no handheld", "no cartoon or illustrated rendering"],
};

const latestPrompt = async (kind: string): Promise<string> => {
  const [g] = await db.select().from(generation)
    .where(eq(generation.projectId, projectId)).orderBy(desc(generation.createdAt)).limit(20);
  const rows = await db.select().from(generation)
    .where(eq(generation.projectId, projectId)).orderBy(desc(generation.createdAt));
  const hit = rows.find((r) => r.kind === kind) ?? g;
  return (hit!.promptSnapshot as { prompt: string }).prompt;
};

let shotId = "";

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "Card Prompt Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Card prompts", aspectRatio: "16:9", targetDurationS: "30",
  });
  await setProjectStyleCard(db, { projectId, card });
  shotId = await createShot(db, {
    organizationId: orgId, projectId, title: "The Silent Office", durationS: 6,
    direction: { synopsis: "a man at a desk", subject: "Pasi", action: "sits motionless" },
  });
});

afterAll(async () => {
  await db.delete(generation).where(eq(generation.projectId, projectId));
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-STB-044: the project's Style Card reaches image and video prompts", () => {
  it("puts the card's look into a frame prompt", async () => {
    await requestFrame(db, { shotId, slot: "start", principal: "user:test", aspectRatio: "16:9" });
    const prompt = await latestPrompt("frame");
    expect(prompt).toContain("Locked-off symmetrical framing.");
    expect(prompt).toContain("Hard directional tungsten key.");
  });

  it("states what must stay identical across shots, so wardrobe stops drifting", async () => {
    const prompt = await latestPrompt("frame");
    expect(prompt).toContain("same grey wool suit");
  });

  it("carries the refusals into the image prompt — 'no cartoon' has to be said to be obeyed", async () => {
    const prompt = await latestPrompt("frame");
    expect(prompt).toMatch(/no cartoon or illustrated rendering/i);
  });

  it("never leaks the reference the card was compiled from (SCN-DIR-002, at the real boundary)", async () => {
    const prompt = await latestPrompt("frame");
    expect(prompt.toLowerCase()).not.toContain("kaurism");
    expect(prompt).not.toContain(card.provenance.brief!);
  });

  it("puts the same look into a take prompt", async () => {
    await requestTake(db, { shotId, principal: "user:test", aspectRatio: "16:9" });
    const prompt = await latestPrompt("take");
    expect(prompt).toContain("Locked-off symmetrical framing.");
    expect(prompt).toContain("same grey wool suit");
    expect(prompt.toLowerCase()).not.toContain("kaurism");
  });
});
