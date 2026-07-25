import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { runNextGeneration } from "@avd/gen";
import { asset } from "@avd/ast/schema";
import { createShot, materializeGenerationOutput, requestTake, selectTake } from "../src/service";
import { shot, take } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();
const dir = { synopsis: "s", subject: "x", action: "y" };

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "TakeBinding Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "TakeBinding", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  // materialize tests create extra takes — clear ALL takes on the project's shots before the
  // shots themselves (FK take_shot_id_fkey), not just the seeded one
  const shots = await db.select({ id: shot.id }).from(shot).where(eq(shot.projectId, projectId));
  if (shots.length) await db.delete(take).where(inArray(take.shotId, shots.map((s) => s.id)));
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(asset).where(eq(asset.organizationId, orgId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

const takeId = uuidv7();

describe("REQ-STB-005: a take belongs to its shot and can never be moved (INV-STB-005)", () => {
  it("selecting a take through a different shot is rejected; no API mutates take.shotId", async () => {
    const shotA = await createShot(db, { organizationId: orgId, projectId, title: "A", direction: dir, durationS: 4 });
    const shotB = await createShot(db, { organizationId: orgId, projectId, title: "B", direction: dir, durationS: 4 });
    const assetId = uuidv7();
    await db.insert(asset).values({
      id: assetId, organizationId: orgId, kind: "video", source: "generated", status: "ready",
      storageKey: `t/${assetId}.mp4`, mime: "video/mp4",
    });
    const genId = uuidv7();
    await db.insert(generation).values({
      id: genId, organizationId: orgId, projectId, kind: "take", target: {},
      modelId: "test-model-ref", promptSnapshot: { prompt: "p", templateVersion: 1, refAssetIds: [] },
      params: {}, status: "succeeded", commandId: uuidv7(), principal: "user:test",
    });
    await db.insert(take).values({ id: takeId, shotId: shotA, videoAssetId: assetId, generationId: genId });

    // INV-STB-005: cross-shot selection rejected — a take is only addressable through its own shot
    await expect(selectTake(db, { shotId: shotB, takeId })).rejects.toMatchObject({ code: "not_found" });
    await selectTake(db, { shotId: shotA, takeId }); // its own shot works

    // and the public service surface offers no take-move operation. Shot reordering
    // (REQ-STB-038 `moveShotToIndex`) moves a shot with its takes still attached — it is not a
    // relocation of a take, so the guard names takes explicitly. "remove*" is deletion.
    const service = await import("../src/service");
    const moveLike = Object.keys(service).filter((k) => /^(move|reassign|transfer).*take/i.test(k));
    expect(moveLike).toEqual([]);
  });
});

// REQ-STB-034 (USER 2026-07-24 "why can't I export"): a bought take that lands on a shot with
// NO selection auto-selects — one take means no creative choice to make, and unselected takes
// silently zero out the export ("Export 0 ready · skip 5").
describe("REQ-STB-034: first take auto-selects", () => {
  it("materializing onto an unselected shot selects it; a second take never steals the selection", async () => {
    process.env.MOCK_GEN = "1";
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "auto-select", durationS: 6,
      direction: { synopsis: "s", subject: "x", action: "y" },
    });
    const g1 = await requestTake(db, { shotId, principal: "user:test", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    const t1 = await materializeGenerationOutput(db, g1);
    let [s] = await db.select().from(shot).where(eq(shot.id, shotId));
    expect(s!.selectedTakeId).toBe(t1!.id); // auto-selected — export sees the shot as ready
    const g2 = await requestTake(db, { shotId, principal: "user:test", aspectRatio: "16:9" });
    await runNextGeneration(db, { organizationId: orgId });
    await materializeGenerationOutput(db, g2);
    [s] = await db.select().from(shot).where(eq(shot.id, shotId));
    expect(s!.selectedTakeId).toBe(t1!.id); // the user's standing choice is never overridden
  });
});
