import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { createShot, updateShotDuration } from "../src/service";
import { shot } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Dur Org" });
  await db.insert(project).values({ id: projectId, organizationId: orgId, title: "Dur", aspectRatio: "16:9", targetDurationS: "12" });
});

afterAll(async () => {
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-STB-025: shot duration update honors INV-STB-001 bounds", () => {
  it("updates within bounds; rejects out-of-bounds", async () => {
    const id = await createShot(db, { organizationId: orgId, projectId, title: "s", direction: { synopsis: "a", subject: "b", action: "c" }, durationS: 6 });
    await updateShotDuration(db, { shotId: id, durationS: 8 });
    const [row] = await db.select().from(shot).where(eq(shot.id, id));
    expect(Number(row!.durationS)).toBe(8);
    await expect(updateShotDuration(db, { shotId: id, durationS: 12 })).rejects.toMatchObject({ code: "validation_failed" });
  });
});
