import { integer, jsonb, numeric, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

// docs/data/40-data-model.md §4 — STB single-writer (system of record).
export const stb = pgSchema("stb");

export const shot = stb.table("shot", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  position: integer("position").notNull(), // INV-STB-002 (unique per project via migration)
  title: text("title").notNull(),
  direction: jsonb("direction").notNull(), // docs/13 §7 shape
  durationS: numeric("duration_s", { precision: 4, scale: 1 }).notNull(), // INV-STB-001
  selectedStartFrameId: uuid("selected_start_frame_id"),
  selectedEndFrameId: uuid("selected_end_frame_id"),
  selectedTakeId: uuid("selected_take_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const frameCandidate = stb.table("frame_candidate", {
  id: uuid("id").primaryKey(),
  shotId: uuid("shot_id").notNull(),
  slot: text("slot", { enum: ["start", "end"] }).notNull(),
  imageAssetId: uuid("image_asset_id").notNull(),
  generationId: uuid("generation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const take = stb.table("take", {
  id: uuid("id").primaryKey(),
  shotId: uuid("shot_id").notNull(),
  videoAssetId: uuid("video_asset_id").notNull(),
  generationId: uuid("generation_id").notNull(),
  retakeOf: uuid("retake_of"),
  durationActualS: numeric("duration_actual_s", { precision: 4, scale: 1 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
