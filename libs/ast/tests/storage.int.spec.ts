import { describe, expect, it } from "vitest";
import { getObject, putObject } from "../src/storage";

// REQ-AST-001 — requires docker-compose minio.
describe("REQ-AST-001: object storage round-trip", () => {
  it("puts and gets identical bytes with mime", async () => {
    const key = `test/roundtrip-${Date.now()}.txt`;
    const bytes = new TextEncoder().encode("director's room");
    await putObject(key, bytes, "text/plain");
    const got = await getObject(key);
    expect(Buffer.from(got.bytes).equals(Buffer.from(bytes))).toBe(true);
    expect(got.mime).toBe("text/plain");
  });
});
