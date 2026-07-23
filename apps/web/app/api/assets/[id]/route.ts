// REQ-AST-003 — dev asset serving; signed URLs replace this for prod (docs/12 §5).
import { eq } from "drizzle-orm";
import { asset } from "@avd/ast/schema";
import { getObject } from "@avd/ast/storage";
import { db } from "../../../../lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a] = await db().select().from(asset).where(eq(asset.id, id));
  if (!a || a.status !== "ready" || a.deletedAt) {
    return Response.json({ error: { code: "not_found", message: "Asset not found" } }, { status: 404 });
  }
  const obj = await getObject(a.storageKey);
  return new Response(Buffer.from(obj.bytes), {
    headers: {
      "Content-Type": a.mime,
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}
