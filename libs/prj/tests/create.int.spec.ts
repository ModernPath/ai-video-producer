import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "../src/schema";
import { createProject } from "../src/service";
import { migrate } from "@avd/shared/migrate";

// REQ-PRJ-002 — double-submits must not duplicate projects.
describe("PRJ idempotent creation", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();

  beforeAll(async () => {
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "PRJ Org" });
  });
  afterAll(async () => {
    await db.delete(project).where(eq(project.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("same commandId returns the same project; no duplicate row", async () => {
    const commandId = uuidv7();
    const a = await createProject(db, { organizationId: orgId, title: "Once", aspectRatio: "16:9", commandId });
    const b = await createProject(db, { organizationId: orgId, title: "Once", aspectRatio: "16:9", commandId });
    expect(b).toBe(a);
    const rows = await db.select().from(project).where(eq(project.organizationId, orgId));
    expect(rows.length).toBe(1);
  });

  it("different commandIds create distinct projects", async () => {
    await createProject(db, { organizationId: orgId, title: "Two", aspectRatio: "9:16", commandId: uuidv7() });
    const rows = await db.select().from(project).where(eq(project.organizationId, orgId));
    expect(rows.length).toBe(2);
  });
});
