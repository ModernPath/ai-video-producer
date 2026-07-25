// REQ-STB-039 one-off: existing audio assets were stored with duration_s NULL, so the workspace
// timeline had no track length to compare the cut against. Probe + persist them.
import { isNull, and, eq } from "drizzle-orm";
import { createDb } from "@avd/shared/db";
import { asset } from "@avd/ast/schema";
import { getObject } from "@avd/ast/storage";
import { recordAssetDuration } from "@avd/ast/probe";

const { db } = createDb();
const rows = await db.select().from(asset).where(and(eq(asset.kind, "audio"), isNull(asset.durationS)));
console.log(`audio assets without duration: ${rows.length}`);
let ok = 0;
for (const a of rows) {
  const obj = await getObject(a.storageKey);
  const ext = (a.mime.split("/")[1] ?? "mp3").replace("mpeg", "mp3");
  const s = await recordAssetDuration(db, a.id, obj.bytes, ext);
  if (s !== null) ok++;
  console.log(`${a.id} → ${s ?? "unprobed"}s`);
}
console.log(`done: ${ok}/${rows.length} probed`);
process.exit(0);
