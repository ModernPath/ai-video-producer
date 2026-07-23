import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDb(url = process.env.DATABASE_URL ?? "postgres://avd:avd@localhost:54329/avd") {
  const client = postgres(url, { max: 5, onnotice: () => {} });
  return { db: drizzle(client), client };
}
export type Db = ReturnType<typeof createDb>["db"];
