// REQ-AST-006 — org-scoped entity library (companies, products, people, characters).
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { asset, entity, projectEntity, styleKit } from "./schema";
import { project } from "@avd/prj/schema";
import { AstValidationError } from "./uploads";

export type EntityKind = "company" | "product" | "person" | "character";

async function assertValidRefs(db: Db, refAssetIds: string[]): Promise<void> {
  const max = config.entity.maxRefs;
  if (refAssetIds.length < 1 || refAssetIds.length > max) {
    throw new AstValidationError("validation_failed", `An entity needs between 1 and ${max} reference images`); // INV-AST-004
  }
  const refs = await db.select().from(asset).where(inArray(asset.id, refAssetIds));
  const bad = refAssetIds.filter((id) => {
    const a = refs.find((r) => r.id === id);
    return !a || a.status !== "ready" || a.kind !== "image";
  });
  if (bad.length) {
    throw new AstValidationError("validation_failed", "Every reference must be a ready image asset");
  }
}

export async function createEntity(
  db: Db,
  input: { organizationId: string; kind: EntityKind; name: string; description: string; refAssetIds: string[] }
): Promise<string> {
  await assertValidRefs(db, input.refAssetIds);
  const id = uuidv7();
  await db.insert(entity).values({
    id,
    organizationId: input.organizationId,
    kind: input.kind,
    name: input.name,
    description: input.description,
    refAssetIds: input.refAssetIds,
  });
  return id;
}

export async function listEntities(db: Db, organizationId: string) {
  return db
    .select()
    .from(entity)
    .where(and(eq(entity.organizationId, organizationId), isNull(entity.archivedAt)));
}

/** Replaces the project's cast (INV-AST-006: attachment is what exposes entities to prompts). */
export async function attachEntities(db: Db, input: { projectId: string; entityIds: string[] }): Promise<void> {
  await db.delete(projectEntity).where(eq(projectEntity.projectId, input.projectId));
  if (input.entityIds.length) {
    await db.insert(projectEntity).values(input.entityIds.map((entityId) => ({ projectId: input.projectId, entityId })));
  }
}

export async function listProjectEntities(db: Db, projectId: string) {
  const rows = await db
    .select({ e: entity })
    .from(projectEntity)
    .innerJoin(entity, eq(projectEntity.entityId, entity.id))
    // REQ-AST-010: archived entities leave prompts too, not just the library listing
    .where(and(eq(projectEntity.projectId, projectId), isNull(entity.archivedAt)));
  return rows.map((r) => r.e);
}

/**
 * REQ-AST-010 — remove one reference image from an entity. Deliberately does NOT validate the
 * asset id: the main use case is cleaning up dangling refs (asset row gone). The asset itself
 * is never touched (INV-AST-003 — originals immortal); removing the last ref is allowed, the
 * entity just loses its design anchor until a new ref is added.
 */
export async function removeEntityRef(db: Db, input: { entityId: string; assetId: string }): Promise<void> {
  const [e] = await db.select().from(entity).where(eq(entity.id, input.entityId));
  if (!e) throw new AstValidationError("not_found", "Entity not found");
  await db.update(entity)
    .set({ refAssetIds: (e.refAssetIds ?? []).filter((id) => id !== input.assetId) })
    .where(eq(entity.id, input.entityId));
}

/**
 * REQ-AST-011 — append reference images to an existing entity (the way back from ref-less
 * after REQ-AST-010 removal). Combined count must respect INV-AST-004's cap; new refs must
 * be ready image assets.
 */
export async function addEntityRefs(db: Db, input: { entityId: string; assetIds: string[] }): Promise<void> {
  const [e] = await db.select().from(entity).where(eq(entity.id, input.entityId));
  if (!e) throw new AstValidationError("not_found", "Entity not found");
  const combined = [...(e.refAssetIds ?? []), ...input.assetIds];
  const max = config.entity.maxRefs;
  if (input.assetIds.length < 1 || combined.length > max) {
    throw new AstValidationError("validation_failed", `An entity needs between 1 and ${max} reference images`); // INV-AST-004
  }
  const refs = await db.select().from(asset).where(inArray(asset.id, input.assetIds));
  const bad = input.assetIds.filter((id) => {
    const a = refs.find((r) => r.id === id);
    return !a || a.status !== "ready" || a.kind !== "image";
  });
  if (bad.length) throw new AstValidationError("validation_failed", "Every reference must be a ready image asset");
  await db.update(entity).set({ refAssetIds: combined }).where(eq(entity.id, input.entityId));
}

/** REQ-AST-010 — soft archive: hides the entity from the library and from every project cast. */
export async function archiveEntity(db: Db, input: { entityId: string }): Promise<void> {
  const [e] = await db.select().from(entity).where(eq(entity.id, input.entityId));
  if (!e) throw new AstValidationError("not_found", "Entity not found");
  await db.update(entity).set({ archivedAt: new Date() }).where(eq(entity.id, input.entityId));
}

/** BR-AST-005: swap an entity ref for its edited version (original asset remains, lineage preserved). */
export async function updateEntityRef(
  db: Db,
  input: { entityId: string; oldAssetId: string; newAssetId: string }
): Promise<void> {
  const [e] = await db.select().from(entity).where(eq(entity.id, input.entityId));
  if (!e) throw new AstValidationError("not_found", "Entity not found");
  if (!e.refAssetIds.includes(input.oldAssetId)) {
    throw new AstValidationError("not_found", "Reference not on this entity");
  }
  const next = e.refAssetIds.map((id) => (id === input.oldAssetId ? input.newAssetId : id));
  await assertValidRefs(db, next);
  await db.update(entity).set({ refAssetIds: next }).where(eq(entity.id, input.entityId));
}

// ---- REQ-AST-007: style kits (styles retained across videos; BR-AST-001 org-scoped) ----

export async function createStyleKit(
  db: Db,
  input: { organizationId: string; name: string; prompt: string }
): Promise<string> {
  if (!input.name.trim() || !input.prompt.trim()) {
    throw new AstValidationError("validation_failed", "Style kit needs a name and a style prompt");
  }
  const id = uuidv7();
  await db.insert(styleKit).values({ id, organizationId: input.organizationId, name: input.name.trim(), prompt: input.prompt.trim() });
  return id;
}

export async function listStyleKits(db: Db, organizationId: string) {
  return db
    .select()
    .from(styleKit)
    .where(and(eq(styleKit.organizationId, organizationId), isNull(styleKit.archivedAt)))
    .orderBy(asc(styleKit.createdAt));
}

/** The style prompt applied to every frame/take of the project (INV-AST-006: attachment exposes it). */
export async function projectStylePrompt(db: Db, projectId: string): Promise<string | null> {
  const [p] = await db.select().from(project).where(eq(project.id, projectId));
  if (!p?.styleKitId) return null;
  const [kit] = await db.select().from(styleKit).where(eq(styleKit.id, p.styleKitId));
  return kit && !kit.archivedAt ? kit.prompt : null;
}
