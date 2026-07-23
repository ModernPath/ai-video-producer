-- 0004: ASM snapshot + export job (REQ-ASM-001..003).
CREATE SCHEMA IF NOT EXISTS asm;

CREATE TABLE IF NOT EXISTS asm.storyboard_snapshot (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES prj.project(id),
  items jsonb NOT NULL,
  audio jsonb NOT NULL DEFAULT '{}',
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asm.export_job (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES prj.project(id),
  snapshot_id uuid NOT NULL REFERENCES asm.storyboard_snapshot(id),
  preset text NOT NULL DEFAULT 'source-concat',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed')),
  progress_stage text,
  output_asset_id uuid,
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);
