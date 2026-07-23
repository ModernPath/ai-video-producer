// REQ-AST-006 — org-scoped entity library (companies, products, people, characters).
import { and, eq, inArray, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { asset, entity, projectEntity } from "./schema";
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
    .where(eq(projectEntity.projectId, projectId));
  return rows.map((r) => r.e);
}
