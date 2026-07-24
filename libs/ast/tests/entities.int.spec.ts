import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset, entity, projectEntity } from "../src/schema";
import { AstValidationError, archiveEntity, attachEntities, createEntity, listEntities, listProjectEntities, removeEntityRef, updateEntityRef } from "../src/entities";
import { migrate } from "../../../scripts/migrate";

// REQ-AST-006 — entity library (requires compose pg).
describe("AST entities", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  const refIds: string[] = [];

  beforeAll(async () => {
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Entity Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Entity Proj", aspectRatio: "16:9", targetDurationS: "30",
    });
    for (let i = 0; i < 6; i++) {
      const id = uuidv7();
      refIds.push(id);
      await db.insert(asset).values({
        id, organizationId: orgId, projectId: null, kind: "image", source: "uploaded",
        status: i === 5 ? "pending" : "ready", storageKey: `test/ref-${i}.png`, mime: "image/png", bytes: 10,
      });
    }
  });
  afterAll(async () => {
    await db.delete(projectEntity).where(eq(projectEntity.projectId, projectId));
    await db.delete(entity).where(eq(entity.organizationId, orgId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("INV-AST-004: rejects 0 refs, >5 refs, and non-ready refs", async () => {
    const base = { organizationId: orgId, kind: "person" as const, name: "Mika", description: "runner" };
    await expect(createEntity(db, { ...base, refAssetIds: [] })).rejects.toThrow(AstValidationError);
    await expect(createEntity(db, { ...base, refAssetIds: refIds })).rejects.toThrow(/1 and 5/);
    await expect(createEntity(db, { ...base, refAssetIds: [refIds[5]!] })).rejects.toThrow(/ready image/);
  });

  it("creates, attaches to project cast, lists with refs", async () => {
    const id = await createEntity(db, {
      organizationId: orgId, kind: "product", name: "KAIJU Can",
      description: "green 330ml energy drink can", refAssetIds: refIds.slice(0, 2),
    });
    await attachEntities(db, { projectId, entityIds: [id] }); // INV-AST-006
    const cast = await listProjectEntities(db, projectId);
    expect(cast.length).toBe(1);
    expect(cast[0]?.name).toBe("KAIJU Can");
    expect(cast[0]?.refAssetIds.length).toBe(2);
  });

  it("BR-AST-005: replaces a ref with an edited version, count preserved", async () => {
    const [e] = await listProjectEntities(db, projectId);
    const oldRef = e!.refAssetIds[0]!;
    const newRef = refIds[2]!; // another ready image
    await updateEntityRef(db, { entityId: e!.id, oldAssetId: oldRef, newAssetId: newRef });
    const [after] = await listProjectEntities(db, projectId);
    expect(after!.refAssetIds).toContain(newRef);
    expect(after!.refAssetIds).not.toContain(oldRef);
    expect(after!.refAssetIds.length).toBe(2);
  });
});

// REQ-AST-010 — USER 2026-07-24 "please allow me deleting assets" (library screenshot with a
// dangling Pasi ref and no removal affordance).
describe("REQ-AST-010: entity deletion (refs + archive)", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();
  let entityId: string;
  const refA = uuidv7();

  beforeAll(async () => {
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Del Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Del Proj", aspectRatio: "16:9", targetDurationS: "30",
    });
    await db.insert(asset).values({
      id: refA, organizationId: orgId, projectId: null, kind: "image", source: "uploaded",
      status: "ready", storageKey: "test/del-ref.png", mime: "image/png", bytes: 10,
    });
    entityId = await createEntity(db, { organizationId: orgId, kind: "person", name: "Del Person", description: "d", refAssetIds: [refA] });
    await attachEntities(db, { projectId, entityIds: [entityId] });
  });
  afterAll(async () => {
    await db.delete(projectEntity).where(eq(projectEntity.projectId, projectId));
    await db.delete(entity).where(eq(entity.organizationId, orgId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("removeEntityRef drops the id even when the asset row is missing (dangling ref case); asset rows are never deleted", async () => {
    const dangling = uuidv7(); // no asset row on purpose
    await db.update(entity).set({ refAssetIds: [refA, dangling] }).where(eq(entity.id, entityId));
    await removeEntityRef(db, { entityId, assetId: dangling });
    let [e] = await db.select().from(entity).where(eq(entity.id, entityId));
    expect(e!.refAssetIds).toEqual([refA]);
    await removeEntityRef(db, { entityId, assetId: refA }); // removing the LAST ref is allowed
    [e] = await db.select().from(entity).where(eq(entity.id, entityId));
    expect(e!.refAssetIds).toEqual([]);
    const [a] = await db.select().from(asset).where(eq(asset.id, refA));
    expect(a).toBeDefined(); // INV-AST-003: originals immortal
  });

  it("archiveEntity hides it from the library AND from project casts (prompts stop carrying it)", async () => {
    await archiveEntity(db, { entityId });
    const lib = await listEntities(db, orgId);
    expect(lib.find((e) => e.id === entityId)).toBeUndefined();
    const cast = await listProjectEntities(db, projectId);
    expect(cast.find((e) => e.id === entityId)).toBeUndefined();
  });
});
