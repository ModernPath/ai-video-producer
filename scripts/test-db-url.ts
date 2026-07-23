/** Single source of truth for the integration-test database location. */
export const TEST_DB_NAME = "avd_test";
export const ADMIN_DATABASE_URL = process.env.DATABASE_URL ?? "postgres://avd:avd@localhost:54329/avd";
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? ADMIN_DATABASE_URL.replace(/\/[^/]+$/, `/${TEST_DB_NAME}`);
