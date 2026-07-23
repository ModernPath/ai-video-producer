import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { createShot, listShots, removeShot, reorderShot } from "../src/service";
import { shot } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();
const dir = { synopsis: "s", subject: "x", action: "y" };

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Reorder Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Reorder", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-STB-022: reorder shots (SCN-STB-010, INV-STB-002)", () => {
  it("moves a shot up/down among LIVE shots; edges are no-ops; order persists atomically", async () => {
    const a = await createShot(db, { organizationId: orgId, projectId, title: "A", direction: dir, durationS: 4 });
    const b = await createShot(db, { organizationId: orgId, projectId, title: "B", direction: dir, durationS: 4 });
    const c = await createShot(db, { organizationId: orgId, projectId, title: "C", direction: dir, durationS: 4 });

    await reorderShot(db, { shotId: b, direction: "up" });
    expect((await listShots(db, projectId)).map((s) => s.title)).toEqual(["B", "A", "C"]);

    await reorderShot(db, { shotId: b, direction: "up" }); // already first — no-op
    expect((await listShots(db, projectId)).map((s) => s.title)).toEqual(["B", "A", "C"]);

    await reorderShot(db, { shotId: a, direction: "down" });
    expect((await listShots(db, projectId)).map((s) => s.title)).toEqual(["B", "C", "A"]);

    await reorderShot(db, { shotId: a, direction: "down" }); // already last — no-op
    expect((await listShots(db, projectId)).map((s) => s.title)).toEqual(["B", "C", "A"]);

    // soft-deleted neighbors are skipped: remove C, then B down swaps with A directly
    await removeShot(db, { shotId: c });
    await reorderShot(db, { shotId: b, direction: "down" });
    expect((await listShots(db, projectId)).map((s) => s.title)).toEqual(["A", "B"]);
  });
});
