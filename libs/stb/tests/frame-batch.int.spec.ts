import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { createShot, requestFrameBatch } from "../src/service";
import { shot } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "FrameBatch Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "FrameBatch", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-GEN-008: frame requests produce n candidates (BR-GEN-002)", () => {
  it("default count enqueues config.frame.candidatesDefault distinct queued generations", async () => {
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "s1",
      direction: { synopsis: "a", subject: "b", action: "c" }, durationS: 4,
    });
    const ids = await requestFrameBatch(db, { shotId, slot: "start", principal: "u", aspectRatio: "16:9" });
    expect(ids).toHaveLength(config.frame.candidatesDefault);
    expect(new Set(ids).size).toBe(ids.length);
    const rows = await db.select().from(generation).where(inArray(generation.id, ids));
    expect(rows).toHaveLength(ids.length);
    for (const r of rows) {
      expect(r.status).toBe("queued");
      expect(r.kind).toBe("frame");
    }
  });

  it("count above candidatesMax clamps to candidatesMax", async () => {
    const shotId = await createShot(db, {
      organizationId: orgId, projectId, title: "s2",
      direction: { synopsis: "a", subject: "b", action: "c" }, durationS: 4,
    });
    const ids = await requestFrameBatch(db, { shotId, slot: "start", principal: "u", aspectRatio: "16:9", count: 99 });
    expect(ids).toHaveLength(config.frame.candidatesMax);
  });
});
