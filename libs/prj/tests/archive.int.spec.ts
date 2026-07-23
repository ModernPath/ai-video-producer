import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { generation } from "@avd/gen/schema";
import { enqueueGeneration } from "@avd/gen";
import { project } from "../src/schema";
import { archiveProject, createProject, unarchiveProject } from "../src/service";
import { migrate } from "../../../scripts/migrate";

// REQ-PRJ-003 — archive lifecycle; BR-PRJ-003: archived projects block new generation enqueue.
describe("REQ-PRJ-003: archive lifecycle", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  let projectId: string;

  const scriptEnqueue = () => ({
    organizationId: orgId,
    projectId,
    principal: "user:test",
    kind: "script" as const,
    commandId: uuidv7(),
    target: {},
    textInput: { projectTitle: "Archive Test", brief: {}, targetDurationSeconds: 30 },
  });

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "PRJ Archive Org" });
    projectId = await createProject(db, {
      organizationId: orgId,
      title: "Archive Test",
      aspectRatio: "16:9",
      commandId: uuidv7(),
    });
  });
  afterAll(async () => {
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("archiveProject flips status active -> archived", async () => {
    const [before] = await db.select().from(project).where(eq(project.id, projectId));
    expect(before?.status).toBe("active");
    await archiveProject(db, { projectId });
    const [after] = await db.select().from(project).where(eq(project.id, projectId));
    expect(after?.status).toBe("archived");
  });

  it("BR-PRJ-003: enqueueGeneration on an archived project is rejected with code project_archived, no row inserted", async () => {
    await expect(enqueueGeneration(db, scriptEnqueue())).rejects.toMatchObject({ code: "project_archived" });
    const rows = await db.select().from(generation).where(eq(generation.organizationId, orgId));
    expect(rows.length).toBe(0);
  });

  it("unarchiveProject flips status back to active and enqueue succeeds again", async () => {
    await unarchiveProject(db, { projectId });
    const [after] = await db.select().from(project).where(eq(project.id, projectId));
    expect(after?.status).toBe("active");
    const genId = await enqueueGeneration(db, scriptEnqueue());
    const [row] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(row?.status).toBe("queued");
  });
});
