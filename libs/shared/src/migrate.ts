// REQ-GEN-033 — the forward-only migrator, owned by shared rather than by `scripts/`.
//
// It lived in `scripts/migrate.ts`, which 32 integration specs imported as `../../../scripts/migrate`
// — a reach across the repo, out of every lib's `rootDir`, that made `pnpm typecheck` emit 10 errors
// and kept the whole gate red. Migration is infrastructure the DB-owning contexts' tests depend on,
// so it belongs beside `db.ts`. `scripts/migrate.ts` is now the CLI wrapper over this.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

/** Repo-root `migrations/`, from `libs/shared/src/` — three levels up. */
const defaultMigrationsDir = () => join(import.meta.dirname, "..", "..", "..", "migrations");

export async function migrate(
  url = process.env.DATABASE_URL ?? "postgres://avd:avd@localhost:54329/avd",
  dir = defaultMigrationsDir()
) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`SELECT pg_advisory_lock(420001)`; // serialize concurrent test-suite migrations
    await sql`CREATE SCHEMA IF NOT EXISTS shared`;
    await sql`CREATE TABLE IF NOT EXISTS shared.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      const [done] = await sql`SELECT 1 FROM shared.schema_migrations WHERE name = ${file}`;
      if (done) continue;
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(join(dir, file), "utf8"));
        await tx`INSERT INTO shared.schema_migrations (name) VALUES (${file})`;
      });
      console.log(`applied ${file}`);
    }
  } finally {
    await sql`SELECT pg_advisory_unlock(420001)`.catch(() => {});
    await sql.end();
  }
}
