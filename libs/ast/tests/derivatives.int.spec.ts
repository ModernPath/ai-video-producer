import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { makeAssetThumb } from "../src/derivatives";
import { getObject, putObject } from "../src/storage";
import { asset } from "../src/schema";

const { db } = createDb();
const orgId = uuidv7();

// 1x1 red PNG
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

beforeAll(async () => {
  delete process.env.DISABLE_THUMBS; // this spec tests the real thing
  await db.insert(organization).values({ id: orgId, name: "Deriv Org" });
});

afterAll(async () => {
  await db.delete(asset).where(eq(asset.organizationId, orgId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

describe("REQ-AST-005: derivatives on ready (BR-AST-002)", () => {
  it("image asset gets a JPEG thumb in storage and thumb_storage_key set", async () => {
    const id = uuidv7();
    const key = `test-deriv/${id}.png`;
    await putObject(key, PNG_1PX, "image/png");
    await db.insert(asset).values({
      id, organizationId: orgId, kind: "image", source: "generated", status: "ready",
      storageKey: key, mime: "image/png",
    });

    await makeAssetThumb(db, id);

    const [row] = await db.select().from(asset).where(eq(asset.id, id));
    expect(row!.thumbStorageKey).toBeTruthy();
    const thumb = await getObject(row!.thumbStorageKey!);
    expect(thumb.bytes.length).toBeGreaterThan(0);
    expect(thumb.mime).toBe("image/jpeg");
  });

  it("is idempotent — second call keeps the existing thumb", async () => {
    const id = uuidv7();
    const key = `test-deriv/${id}.png`;
    await putObject(key, PNG_1PX, "image/png");
    await db.insert(asset).values({
      id, organizationId: orgId, kind: "image", source: "generated", status: "ready",
      storageKey: key, mime: "image/png",
    });
    await makeAssetThumb(db, id);
    const [first] = await db.select().from(asset).where(eq(asset.id, id));
    await makeAssetThumb(db, id);
    const [second] = await db.select().from(asset).where(eq(asset.id, id));
    expect(second!.thumbStorageKey).toBe(first!.thumbStorageKey);
  });
});
