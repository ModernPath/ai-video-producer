// REQ-AST-003 — dev asset serving; signed URLs replace this for prod (docs/12 §5).
import { eq } from "drizzle-orm";
import { asset } from "@avd/ast/schema";
import { getObject } from "@avd/ast/storage";
import { db } from "../../../../lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a] = await db().select().from(asset).where(eq(asset.id, id));
  if (!a || a.status !== "ready" || a.deletedAt) {
    return Response.json({ error: { code: "not_found", message: "Asset not found" } }, { status: 404 });
  }
  // REQ-AST-005: ?thumb=1 serves the small derivative (falls back to the original if absent)
  const wantThumb = new URL(req.url).searchParams.get("thumb") === "1";
  const useThumb = wantThumb && !!a.thumbStorageKey;
  const obj = await getObject(useThumb ? a.thumbStorageKey! : a.storageKey);
  return new Response(Buffer.from(obj.bytes), {
    headers: {
      "Content-Type": useThumb ? "image/jpeg" : a.mime,
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}
