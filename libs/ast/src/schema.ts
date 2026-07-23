import { integer, numeric, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

// docs/data/40-data-model.md §6 — AST single-writer. Created as part of the GEN
// vertical slice (GEN writes assets only via this module's insert helpers later).
export const ast = pgSchema("ast");

export const asset = ast.table("asset", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id"),
  kind: text("kind", { enum: ["image", "video", "audio"] }).notNull(),
  source: text("source", { enum: ["generated", "uploaded"] }).notNull(),
  status: text("status", { enum: ["pending", "ready", "failed"] }).notNull().default("pending"),
  storageKey: text("storage_key").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes"),
  checksum: text("checksum"),
  width: integer("width"),
  height: integer("height"),
  durationS: numeric("duration_s", { precision: 5, scale: 1 }),
  generationId: uuid("generation_id"),
  editOf: uuid("edit_of"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
