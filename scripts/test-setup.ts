/**
 * Vitest globalSetup: integration tests get their OWN database (avd_test).
 * Why: interrupted runs used to leave org/project debris in the dev DB (broke
 * dev-org resolution, REQ-PLT-001) and the live queue worker stole pg-boss test
 * jobs from the shared DB (flaky worker suite).
 */
import postgres from "postgres";
import { migrate } from "./migrate";
import { TEST_DATABASE_URL, ADMIN_DATABASE_URL, TEST_DB_NAME } from "./test-db-url";

export default async function setup() {
  // REQ-GEN-035: the unit ring (`pnpm test:unit`) runs without Postgres — that is what lets CI be
  // fast and deterministic. Guarded here rather than in a second vitest config, which would be a
  // copy free to drift from this one (CLAUDE.md §1.11).
  if (process.env.AVD_SKIP_DB_SETUP === "1") return;

  const admin = postgres(ADMIN_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    const [exists] = await admin`SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_NAME}`;
    if (!exists) await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
  } finally {
    await admin.end();
  }
  await migrate(TEST_DATABASE_URL);
}
