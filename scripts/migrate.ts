/** Minimal forward-only migrator: applies migrations/*.sql once, tracked in shared.schema_migrations. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

export async function migrate(url = process.env.DATABASE_URL ?? "postgres://avd:avd@localhost:54329/avd") {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`SELECT pg_advisory_lock(420001)`; // serialize concurrent test-suite migrations
    await sql`CREATE SCHEMA IF NOT EXISTS shared`;
    await sql`CREATE TABLE IF NOT EXISTS shared.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const dir = join(import.meta.dirname, "..", "migrations");
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

if (process.argv[1]?.endsWith("migrate.ts")) {
  // no top-level await: tsx transpiles to CJS when cwd lacks "type": "module"
  migrate().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
