import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { archiveProject, unarchiveProject } from "@avd/prj/service";
import { createSnapshot } from "../src/service";
import { storyboardSnapshot } from "../src/schema";
import { eq } from "drizzle-orm";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "ArchiveGuard Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "ArchiveGuard", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  await db.delete(storyboardSnapshot).where(eq(storyboardSnapshot.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-ASM-008: archived projects cannot export (BR-PRJ-003)", () => {
  it("createSnapshot rejects with project_archived while archived; allowed after unarchive", async () => {
    await archiveProject(db, { projectId });
    await expect(createSnapshot(db, { projectId, principal: "user:test" })).rejects.toMatchObject({
      code: "project_archived",
    });
    await unarchiveProject(db, { projectId });
    // after unarchive the guard no longer fires — failure (if any) is about content, not archival
    await expect(createSnapshot(db, { projectId, principal: "user:test" })).rejects.not.toMatchObject({
      code: "project_archived",
    });
  });
});
