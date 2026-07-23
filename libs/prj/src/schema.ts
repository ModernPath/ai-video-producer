import { jsonb, numeric, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "@avd/plt/schema";

// docs/data/40-data-model.md §3 — PRJ. FK to plt.organization is allowed (docs/02 §6).
export const prj = pgSchema("prj");

export const project = prj.table("project", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id), // INV-PRJ-001
  title: text("title").notNull(),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  styleKitId: uuid("style_kit_id"), // REQ-AST-007
  aspectRatio: text("aspect_ratio", { enum: ["16:9", "9:16"] }).notNull(),
  targetDurationS: numeric("target_duration_s", { precision: 5, scale: 1 }).notNull(),
  brief: jsonb("brief").notNull().default({}),
  audioMixMode: text("audio_mix_mode", { enum: ["native", "music", "mix"] }).notNull().default("native"),
  commandId: uuid("command_id"), // REQ-PRJ-002 idempotent create
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
