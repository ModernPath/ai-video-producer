// REQ-GEN-017 — project activity fingerprint: a cheap cross-context read model that
// moves whenever anything user-visible changes (docs/02 §5 sync read models).
// The SSE bridge polls this; a real outbox push replaces it later (deferral in GEN LOG).
import { sql } from "drizzle-orm";
import type { Db } from "@avd/shared/db";

export async function projectActivityFingerprint(db: Db, projectId: string): Promise<string> {
  const [row] = await db.execute<Record<string, unknown>>(sql`
    SELECT
      (SELECT count(*) || ':' || coalesce(max(extract(epoch from greatest(created_at, coalesce(finished_at, created_at))))::text, '')
         FROM gen.generation WHERE project_id = ${projectId}) AS gen,
      (SELECT count(*) FROM stb.shot WHERE project_id = ${projectId} AND deleted_at IS NULL) AS shots,
      (SELECT coalesce(string_agg(coalesce(selected_take_id::text,'') || coalesce(selected_start_frame_id::text,''), ''), '')
         FROM stb.shot WHERE project_id = ${projectId}) AS selections,
      (SELECT count(*) FROM stb.frame_candidate fc JOIN stb.shot s ON s.id = fc.shot_id WHERE s.project_id = ${projectId}) AS frames,
      (SELECT count(*) FROM stb.take t JOIN stb.shot s ON s.id = t.shot_id WHERE s.project_id = ${projectId}) AS takes,
      (SELECT count(*) || ':' || coalesce(string_agg(status, ',' ORDER BY created_at), '')
         FROM asm.export_job WHERE project_id = ${projectId}) AS exports,
      (SELECT count(*) FROM stb.script_version WHERE project_id = ${projectId}) AS scripts,
      (SELECT count(*) || ':' || coalesce(string_agg(status, ',' ORDER BY created_at), '')
         FROM stb.shot_plan_proposal WHERE project_id = ${projectId}) AS proposals
  `);
  return JSON.stringify(row);
}
