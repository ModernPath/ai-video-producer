import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { listEntities } from "@avd/ast";
import { entity, projectEntity } from "@avd/ast/schema";
import { castFromPortrait, requestEntityPortrait } from "../src/service";

// REQ-STB-048 (USER 2026-07-27) — cast a character the plan asked for by generating their portrait.
//
// Ordering is forced by INV-AST-004: an entity needs 1–5 reference images to exist at all, so the
// portrait must be generated FIRST and the entity created from it. That is the right order anyway —
// an entity with no refs contributes nothing to consistency, which is the point of casting.
const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();
const APPEARANCE = "Stocky Finnish man, 50s, grey moustache, brown corduroy jacket";
const created: string[] = [];

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "Cast Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Cast", aspectRatio: "16:9", targetDurationS: "30",
  });
});

afterAll(async () => {
  // project_entity references entity — clear the join row first or the FK blocks the delete.
  await db.delete(projectEntity).where(eq(projectEntity.projectId, projectId));
  if (created.length) await db.delete(entity).where(eq(entity.id, created[0]!));
  await db.delete(generation).where(eq(generation.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-STB-048: casting a character from a generated portrait", () => {
  let genId = "";

  it("enqueues a frame generation from the appearance alone", async () => {
    genId = await requestEntityPortrait(db, {
      projectId, appearance: APPEARANCE, principal: "user:test", aspectRatio: "16:9",
    });
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(g!.kind).toBe("frame");
    expect((g!.promptSnapshot as { prompt: string }).prompt).toContain("grey moustache");
  });

  it("asks for a plain reference portrait, not a scene", async () => {
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    const prompt = (g!.promptSnapshot as { prompt: string }).prompt;
    expect(prompt).toMatch(/plain|neutral|reference portrait/i);
  });

  it("bakes no scene into a reference that every later shot is conditioned on", async () => {
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    const prompt = (g!.promptSnapshot as { prompt: string }).prompt.toLowerCase();
    for (const scene of ["diner", "tram", "hallway", "booth"]) expect(prompt).not.toContain(scene);
  });

  it("creates the cast member from the finished portrait and attaches them to the project", async () => {
    // Run THIS generation, not "the next queued one" — `runNextGeneration` claims any queued row,
    // so under a parallel suite it ran another file's work and left the portrait unrendered. This
    // mirrors the production fix in `castMemberAction`.
    const { runGenerationById } = await import("@avd/gen");
    await runGenerationById(db, genId);
    const entityId = await castFromPortrait(db, {
      projectId, generationId: genId, name: "The Colleague", kind: "character",
      description: "Pasi's silent co-worker",
    });
    created.push(entityId);
    const [e] = (await listEntities(db, orgId)).filter((x) => x.id === entityId);
    expect(e!.name).toBe("The Colleague");
    expect(e!.refAssetIds).toHaveLength(1); // INV-AST-004 satisfied by the portrait
    const { listProjectEntities } = await import("@avd/ast");
    expect((await listProjectEntities(db, projectId)).map((x) => x.id)).toContain(entityId);
  });

  it("refuses to cast from a generation that produced no image", async () => {
    await expect(castFromPortrait(db, {
      projectId, generationId: uuidv7(), name: "Nobody", kind: "character", description: "x",
    })).rejects.toThrow(/not found|no image/i);
  });
});
