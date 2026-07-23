import { jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

// docs/data/40-data-model.md §7 — ASM single-writer.
export const asm = pgSchema("asm");

export const storyboardSnapshot = asm.table("storyboard_snapshot", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  items: jsonb("items").notNull(), // [{shotId, position, takeId, videoAssetId, durationS}] — INV-ASM-001 immutable
  audio: jsonb("audio").notNull().default({}),
  excluded: jsonb("excluded").notNull().default([]), // REQ-ASM-008 provenance
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// REQ-ASM-007 / INV-ASM-005 — token-scoped, revocable share links (migration 0014).
export const shareLink = asm.table("share_link", {
  id: uuid("id").primaryKey(),
  exportJobId: uuid("export_job_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
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
