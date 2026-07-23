import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { setProjectStyleKit } from "@avd/prj/service";
import { createStyleKit, listStyleKits, projectStylePrompt } from "../src/entities";
import { styleKit } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: "Style Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Styled", aspectRatio: "16:9", targetDurationS: "12",
  });
});

afterAll(async () => {
  await db.update(project).set({ styleKitId: null }).where(eq(project.id, projectId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(styleKit).where(eq(styleKit.organizationId, orgId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-AST-007: style kits retained across videos (INV-AST-006, BR-AST-001)", () => {
  it("creates an org-level style kit and lists it", async () => {
    const id = await createStyleKit(db, { organizationId: orgId, name: "Neon noir", prompt: "neon-lit rainy streets, teal and magenta palette, anamorphic flares, film grain" });
    const kits = await listStyleKits(db, orgId);
    expect(kits.map((k) => k.id)).toContain(id);
    expect(kits.find((k) => k.id === id)!.name).toBe("Neon noir");
  });

  it("attaching a kit to a project makes its prompt resolvable; detaching clears it", async () => {
    const id = await createStyleKit(db, { organizationId: orgId, name: "Warm docu", prompt: "handheld 16mm documentary, warm golden hour tones" });
    await setProjectStyleKit(db, { projectId, styleKitId: id });
    expect(await projectStylePrompt(db, projectId)).toBe("handheld 16mm documentary, warm golden hour tones");
    await setProjectStyleKit(db, { projectId, styleKitId: null });
    expect(await projectStylePrompt(db, projectId)).toBeNull();
  });

  it("rejects blank name or prompt", async () => {
    await expect(createStyleKit(db, { organizationId: orgId, name: " ", prompt: "x" })).rejects.toMatchObject({ code: "validation_failed" });
    await expect(createStyleKit(db, { organizationId: orgId, name: "x", prompt: "" })).rejects.toMatchObject({ code: "validation_failed" });
  });
});
