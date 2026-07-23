import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { setProjectStyleKit } from "@avd/prj/service";
import { createStyleKit } from "@avd/ast";
import { styleKit } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { createShot, requestFrame } from "../src/service";
import { shot } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "StylePrompt Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "StylePrompt", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  await db.delete(generation).where(eq(generation.organizationId, orgId));
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(styleKit).where(eq(styleKit.organizationId, orgId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-AST-007: style flows into generation prompts", () => {
  it("frame prompt snapshot includes the attached kit's style prompt", async () => {
    const kitId = await createStyleKit(db, { organizationId: orgId, name: "Grain", prompt: "gritty 35mm film grain, muted colors" });
    await setProjectStyleKit(db, { projectId, styleKitId: kitId });
    const shotId = await createShot(db, { organizationId: orgId, projectId, title: "s", direction: { synopsis: "a", subject: "b", action: "c" }, durationS: 4 });
    const genId = await requestFrame(db, { shotId, slot: "start", principal: "u", aspectRatio: "16:9" });
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    expect((g!.promptSnapshot as { prompt: string }).prompt).toContain("gritty 35mm film grain");
  });
});
