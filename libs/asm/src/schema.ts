import { jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

// docs/data/40-data-model.md §7 — ASM single-writer.
export const asm = pgSchema("asm");

export const storyboardSnapshot = asm.table("storyboard_snapshot", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  items: jsonb("items").notNull(), // [{shotId, position, takeId, videoAssetId, durationS}] — INV-ASM-001 immutable
  audio: jsonb("audio").notNull().default({}),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exportJob = asm.table("export_job", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  snapshotId: uuid("snapshot_id").notNull(),
  preset: text("preset").notNull().default("source-concat"),
  status: text("status", { enum: ["queued", "running", "succeeded", "failed"] }).notNull().default("queued"),
  progressStage: text("progress_stage"),
  outputAssetId: uuid("output_asset_id"),
  errorDetail: text("error_detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});
