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
  thumbStorageKey: text("thumb_storage_key"), // REQ-AST-005
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const uploadSession = ast.table("upload_session", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id"),
  kind: text("kind", { enum: ["image", "audio"] }).notNull(),
  mime: text("mime").notNull(),
  declaredBytes: integer("declared_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  status: text("status", { enum: ["pending", "completed", "expired"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const entity = ast.table("entity", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  kind: text("kind", { enum: ["company", "product", "person", "character", "location"] }).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  profile: text("profile"), // REQ-AST-012: long-form background for text prompts (marketing context)
  refAssetIds: uuid("ref_asset_ids").array().notNull(), // INV-AST-004: 1–5, service-enforced
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectEntity = ast.table("project_entity", {
  projectId: uuid("project_id").notNull(),
  entityId: uuid("entity_id").notNull(),
});

export const styleKit = ast.table("style_kit", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});
