import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { createShot, listShots, moveShotToIndex, removeShot } from "../src/service";
import { shot } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();
const dir = { synopsis: "s", subject: "x", action: "y" };

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Move Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Move", aspectRatio: "16:9", targetDurationS: "20",
  });
});

afterAll(async () => {
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

const titles = async () => (await listShots(db, projectId)).map((s) => s.title);
const positions = async () => (await listShots(db, projectId)).map((s) => s.position);

// REQ-STB-038 (USER 2026-07-25): "how can I actually change the order of the clips?" — a positional
// move, so dragging a clip anywhere is ONE command instead of N neighbour swaps.
describe("REQ-STB-038: move a shot to an arbitrary index", () => {
  let a = "", b = "", c = "", d = "";

  it("seeds four shots in order", async () => {
    a = await createShot(db, { organizationId: orgId, projectId, title: "A", direction: dir, durationS: 4 });
    b = await createShot(db, { organizationId: orgId, projectId, title: "B", direction: dir, durationS: 4 });
    c = await createShot(db, { organizationId: orgId, projectId, title: "C", direction: dir, durationS: 4 });
    d = await createShot(db, { organizationId: orgId, projectId, title: "D", direction: dir, durationS: 4 });
    expect(await titles()).toEqual(["A", "B", "C", "D"]);
  });

  it("moves the last shot to the front in one call", async () => {
    await moveShotToIndex(db, { shotId: d, toIndex: 0 });
    expect(await titles()).toEqual(["D", "A", "B", "C"]);
  });

  it("moves a shot to the end", async () => {
    await moveShotToIndex(db, { shotId: d, toIndex: 3 });
    expect(await titles()).toEqual(["A", "B", "C", "D"]);
  });

  it("moves forward past later siblings (index counts the list WITHOUT the moving shot)", async () => {
    await moveShotToIndex(db, { shotId: a, toIndex: 2 });
    expect(await titles()).toEqual(["B", "C", "A", "D"]);
  });

  it("moves backward", async () => {
    await moveShotToIndex(db, { shotId: a, toIndex: 0 });
    expect(await titles()).toEqual(["A", "B", "C", "D"]);
  });

  it("keeps positions contiguous and 1-based (INV-STB-002)", async () => {
    await moveShotToIndex(db, { shotId: c, toIndex: 0 });
    expect(await positions()).toEqual([1, 2, 3, 4]);
    await moveShotToIndex(db, { shotId: c, toIndex: 2 });
    expect(await titles()).toEqual(["A", "B", "C", "D"]);
  });

  it("clamps an out-of-range index instead of throwing", async () => {
    await moveShotToIndex(db, { shotId: a, toIndex: 99 });
    expect(await titles()).toEqual(["B", "C", "D", "A"]);
    await moveShotToIndex(db, { shotId: a, toIndex: -5 });
    expect(await titles()).toEqual(["A", "B", "C", "D"]);
  });

  it("moving to its current index is a no-op", async () => {
    await moveShotToIndex(db, { shotId: b, toIndex: 1 });
    expect(await titles()).toEqual(["A", "B", "C", "D"]);
    expect(await positions()).toEqual([1, 2, 3, 4]);
  });

  it("rejects an unknown shot", async () => {
    await expect(moveShotToIndex(db, { shotId: uuidv7(), toIndex: 0 })).rejects.toThrow(/not found/i);
  });
});

// The unique index is (project_id, position) over ALL rows — soft-deleted shots keep their slot
// (see createShot). A naive renumber to 1..n therefore collides with a removed shot's position.
describe("REQ-STB-038: moving works after a shot was removed", () => {
  it("reorders around a soft-deleted shot's reserved position", async () => {
    const p2 = uuidv7();
    await db.insert(project).values({
      id: p2, organizationId: orgId, title: "Move2", aspectRatio: "16:9", targetDurationS: "20",
    });
    const w = await createShot(db, { organizationId: orgId, projectId: p2, title: "W", direction: dir, durationS: 4 });
    const x = await createShot(db, { organizationId: orgId, projectId: p2, title: "X", direction: dir, durationS: 4 });
    const y = await createShot(db, { organizationId: orgId, projectId: p2, title: "Y", direction: dir, durationS: 4 });
    await removeShot(db, { shotId: x }); // position 2 stays reserved by the deleted row

    await moveShotToIndex(db, { shotId: y, toIndex: 0 });
    expect((await listShots(db, p2)).map((s) => s.title)).toEqual(["Y", "W"]);

    await moveShotToIndex(db, { shotId: y, toIndex: 1 });
    expect((await listShots(db, p2)).map((s) => s.title)).toEqual(["W", "Y"]);

    await db.delete(shot).where(eq(shot.projectId, p2));
    await db.delete(project).where(eq(project.id, p2));
  });
});
