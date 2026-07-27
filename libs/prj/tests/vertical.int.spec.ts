import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { organization } from "@avd/plt/schema";
import { project } from "../src/schema.js";
import { migrate } from "@avd/shared/migrate";

// Prompt 0B exit gate: trivial vertical slice — create tenant + project, persist, query.
// Requires docker-compose postgres (pnpm compose:up).
describe("harness vertical: org -> project -> query", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    await migrate();
  });
  afterAll(async () => {
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("persists and reads back through both schemas", async () => {
    await db.insert(organization).values({ id: orgId, name: "Test Org" });
    await db.insert(project).values({
      id: projectId,
      organizationId: orgId,
      title: "Vertical Slice",
      aspectRatio: config.project.defaultAspectRatio,
      targetDurationS: String(config.project.defaultTargetDurationSeconds),
    });

    const rows = await db.select().from(project).where(eq(project.organizationId, orgId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Vertical Slice");
    expect(rows[0]?.aspectRatio).toBe("16:9");
  });
});
