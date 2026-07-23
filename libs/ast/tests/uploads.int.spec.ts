import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { asset, uploadSession } from "../src/schema";
import { AstValidationError, completeUpload, createUploadSession, uploadBytesDirect } from "../src/uploads";
import { migrate } from "../../../scripts/migrate";

// REQ-AST-004 — validated uploads, presigned + direct (requires compose minio+pg).
describe("AST uploads", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();

  beforeAll(async () => {
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Upload Org" });
  });
  afterAll(async () => {
    await db.delete(uploadSession).where(eq(uploadSession.organizationId, orgId));
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("rejects disallowed mime and oversize payloads (INV-AST-005)", async () => {
    await expect(
      createUploadSession(db, { organizationId: orgId, projectId: null, kind: "audio", mime: "video/mp4", declaredBytes: 1000 })
    ).rejects.toThrow(AstValidationError);
    await expect(
      createUploadSession(db, { organizationId: orgId, projectId: null, kind: "image", mime: "image/png", declaredBytes: 999_999_999 })
    ).rejects.toThrow(/size/i);
  });

  it("presigned round-trip: PUT to url, complete -> ready asset with matching bytes", async () => {
    const bytes = new TextEncoder().encode("ID3 fake mp3 payload for round trip");
    const session = await createUploadSession(db, {
      organizationId: orgId, projectId: null, kind: "audio", mime: "audio/mpeg", declaredBytes: bytes.byteLength,
    });
    const res = await fetch(session.url, { method: "PUT", body: bytes, headers: { "Content-Type": "audio/mpeg" } });
    expect(res.ok).toBe(true);
    const assetId = await completeUpload(db, session.sessionId);
    const [a] = await db.select().from(asset).where(eq(asset.id, assetId));
    expect(a?.status).toBe("ready");
    expect(a?.source).toBe("uploaded");
    expect(a?.bytes).toBe(bytes.byteLength);
  });

  it("direct bytes path creates a ready asset", async () => {
    const id = await uploadBytesDirect(db, {
      organizationId: orgId, projectId: null, kind: "image", mime: "image/png",
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9]),
    });
    const [a] = await db.select().from(asset).where(eq(asset.id, id));
    expect(a?.status).toBe("ready");
    expect(a?.kind).toBe("image");
  });
});
