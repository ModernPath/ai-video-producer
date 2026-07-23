import { createDb } from "@avd/shared/db";

const globalForDb = globalThis as unknown as { __avdDb?: ReturnType<typeof createDb> };
export function db() {
  globalForDb.__avdDb ??= createDb();
  return globalForDb.__avdDb.db;
}
