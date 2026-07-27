import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { createShot, updateShotDialogue } from "../src/service";
import { shot } from "../src/schema";

// USER 2026-07-27: the script wrote spoken lines ("The legacy code lacks discipline.") but every
// shot stored `dialogue` empty, and there was nowhere in the product to type one — so a line could
// only be recovered by re-planning, which would discard takes the user had already paid for.
const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();
let shotId = "";

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Dialogue Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Dialogue", aspectRatio: "16:9", targetDurationS: "30",
  });
  shotId = await createShot(db, {
    organizationId: orgId, projectId, title: "Pasi Close-Up", durationS: 6,
    direction: { synopsis: "close-up", subject: "Pasi", action: "stares past the lens", mood: "deadpan" },
  });
});

afterAll(async () => {
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

const directionOf = async () =>
  (await db.select().from(shot).where(eq(shot.id, shotId)))[0]!.direction as Record<string, unknown>;

describe("REQ-STB-046: a shot's spoken line is editable without re-planning", () => {
  it("stores a line on a shot that had none", async () => {
    await updateShotDialogue(db, { shotId, dialogue: "The legacy code lacks discipline." });
    expect((await directionOf()).dialogue).toBe("The legacy code lacks discipline.");
  });

  it("leaves the rest of the direction untouched — it is one JSON column", async () => {
    const d = await directionOf();
    expect(d.subject).toBe("Pasi");
    expect(d.action).toBe("stares past the lens");
    expect(d.mood).toBe("deadpan");
  });

  it("replaces an existing line", async () => {
    await updateShotDialogue(db, { shotId, dialogue: "We need structure." });
    expect((await directionOf()).dialogue).toBe("We need structure.");
  });

  it("clears the line when emptied, so a shot can be made silent again", async () => {
    await updateShotDialogue(db, { shotId, dialogue: "   " });
    expect((await directionOf()).dialogue).toBeUndefined();
  });

  it("rejects an unknown shot", async () => {
    await expect(updateShotDialogue(db, { shotId: uuidv7(), dialogue: "x" })).rejects.toThrow(/not found/i);
  });
});
