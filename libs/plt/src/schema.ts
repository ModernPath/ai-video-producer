import { pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

// docs/data/40-data-model.md §2 — PLT owns tenancy tables (single-writer).
export const plt = pgSchema("plt");

export const organization = plt.table("organization", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
