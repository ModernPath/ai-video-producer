import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "../src/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { enqueueGeneration, runNextGeneration } from "@avd/gen";
import { projectActivityFingerprint } from "../src/activity";
import { migrate } from "../../../scripts/migrate";

// REQ-GEN-017 — the SSE bridge fires when this fingerprint moves.
describe("project activity fingerprint", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Activity Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Activity", aspectRatio: "16:9", targetDurationS: "30",
    });
  });
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("changes when a generation is enqueued and again when it completes", async () => {
    const f0 = await projectActivityFingerprint(db, projectId);
    await enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "user:test", kind: "frame",
      commandId: uuidv7(), target: { shotId: uuidv7() },
      promptInput: { aspectRatio: "16:9", durationSeconds: 6, entities: [], direction: { synopsis: "s", subject: "x", action: "y" } },
    });
    const f1 = await projectActivityFingerprint(db, projectId);
    expect(f1).not.toBe(f0);
    await runNextGeneration(db, { organizationId: orgId });
    const f2 = await projectActivityFingerprint(db, projectId);
    expect(f2).not.toBe(f1);
    const f3 = await projectActivityFingerprint(db, projectId);
    expect(f3).toBe(f2); // stable when nothing happens
  });
});
