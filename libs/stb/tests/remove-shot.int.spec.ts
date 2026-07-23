import { inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { createShot, listShots, removeShot, selectTake } from "../src/service";
import { shot, take } from "../src/schema";

const { db } = createDb();
const shotIds: string[] = [];
const orgId = uuidv7();
const projectId = uuidv7();
const dir = { synopsis: "s", subject: "x", action: "y" };

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "RemoveShot Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "RemoveShot", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  if (shotIds.length) {
    await db.delete(take).where(inArray(take.shotId, shotIds));
    await db.delete(shot).where(inArray(shot.id, shotIds));
  }
});

describe("REQ-STB-019: remove shot", () => {
  it("soft-deletes a plain shot; listShots no longer returns it", async () => {
    const id = await createShot(db, { organizationId: orgId, projectId, title: "cut me", direction: dir, durationS: 4 });
    shotIds.push(id);
    await removeShot(db, { shotId: id });
    const shots = await listShots(db, projectId);
    expect(shots.map((s) => s.id)).not.toContain(id);
  });

  it("refuses to remove a shot with a selected take unless confirmPaid (INV-STB-007)", async () => {
    const id = await createShot(db, { organizationId: orgId, projectId, title: "paid", direction: dir, durationS: 4 });
    shotIds.push(id);
    const assetId = uuidv7();
    await db.insert(asset).values({
      id: assetId, organizationId: orgId, kind: "video", source: "generated", status: "ready",
      storageKey: `test/${assetId}.mp4`, mime: "video/mp4",
    });
    const genId = uuidv7();
    await db.insert(generation).values({
      id: genId, organizationId: orgId, projectId, kind: "take", target: {},
      modelId: "test-model-ref", promptSnapshot: { prompt: "p", templateVersion: 1, refAssetIds: [] },
      params: {}, status: "succeeded", commandId: uuidv7(), principal: "user:test",
    });
    const takeId = uuidv7();
    await db.insert(take).values({ id: takeId, shotId: id, videoAssetId: assetId, generationId: genId });
    await selectTake(db, { shotId: id, takeId });

    await expect(removeShot(db, { shotId: id })).rejects.toMatchObject({ code: "conflict" });
    await removeShot(db, { shotId: id, confirmPaid: true });
    const shots = await listShots(db, projectId);
    expect(shots.map((s) => s.id)).not.toContain(id);
  });

  it("removing an already-removed shot throws not_found", async () => {
    const id = await createShot(db, { organizationId: orgId, projectId, title: "twice", direction: dir, durationS: 4 });
    shotIds.push(id);
    await removeShot(db, { shotId: id });
    await expect(removeShot(db, { shotId: id })).rejects.toMatchObject({ code: "not_found" });
  });
});
