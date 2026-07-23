import { integer, jsonb, numeric, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

// docs/data/40-data-model.md §5 — GEN single-writer.
export const gen = pgSchema("gen");

export const generation = gen.table("generation", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  kind: text("kind", {
    enum: ["script", "shot_plan", "direction", "frame", "image_edit", "take", "retake", "music_brief", "music", "animation"],
  }).notNull(),
  target: jsonb("target").notNull().default({}),
  modelId: text("model_id").notNull(),
  promptSnapshot: jsonb("prompt_snapshot").notNull(), // INV-GEN-001: written before execution
  params: jsonb("params").notNull().default({}),
  status: text("status", { enum: ["queued", "running", "succeeded", "failed", "canceled"] })
    .notNull()
    .default("queued"),
  attempt: integer("attempt").notNull().default(1),
  retryOf: uuid("retry_of"),
  errorCode: text("error_code"),
  errorDetail: text("error_detail"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
  providerOpRef: text("provider_op_ref"),
  outputAssetIds: uuid("output_asset_ids").array(),
  output: jsonb("output"), // text-kind results (script text, shot plan JSON)
  commandId: uuid("command_id").notNull(),
  principal: text("principal").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});
