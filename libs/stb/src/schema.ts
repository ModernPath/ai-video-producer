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
  imagePrompt: text("image_prompt"), // REQ-STB-013: user-authored image script (null = auto)
  videoPrompt: text("video_prompt"), // REQ-STB-013: user-authored video script (null = auto)
  refAssetIds: uuid("ref_asset_ids").array(), // REQ-STB-016: per-shot ref images (null = whole-cast default)
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

export const scriptVersion = stb.table("script_version", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  source: text("source", { enum: ["drafted", "revised", "manual"] }).notNull().default("drafted"),
  generationId: uuid("generation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shotPlanProposal = stb.table("shot_plan_proposal", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  scriptVersionId: uuid("script_version_id"),
  changes: jsonb("changes").notNull(),
  status: text("status", { enum: ["proposed", "applied", "discarded"] }).notNull().default("proposed"),
  generationId: uuid("generation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const musicBrief = stb.table("music_brief", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull().unique(),
  prompt: text("prompt").notNull(),
  generationId: uuid("generation_id"),
  activeTrackAssetId: uuid("active_track_asset_id"),
  transcript: text("transcript"), // REQ-GEN-020
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
