-- 0002: GEN generation table + AST asset table (GEN vertical slice, REQ-GEN-001/002/003).
CREATE SCHEMA IF NOT EXISTS gen;
CREATE SCHEMA IF NOT EXISTS ast;

CREATE TABLE IF NOT EXISTS ast.asset (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid,
  kind text NOT NULL CHECK (kind IN ('image','video','audio')),
  source text NOT NULL CHECK (source IN ('generated','uploaded')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','failed')),
  storage_key text NOT NULL,
  mime text NOT NULL,
  bytes integer,
  checksum text,
  width integer,
  height integer,
  duration_s numeric(5,1),
  generation_id uuid,
  edit_of uuid REFERENCES ast.asset(id), -- INV-AST-001 lineage
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS gen.generation (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('script','shot_plan','direction','frame','image_edit','take','retake','music_brief')),
  target jsonb NOT NULL DEFAULT '{}',
  model_id text NOT NULL,
  prompt_snapshot jsonb NOT NULL, -- INV-GEN-001
  params jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','canceled')),
  attempt integer NOT NULL DEFAULT 1,
  retry_of uuid,
  error_code text,
  error_detail text,
  cost_usd numeric(10,4),
  provider_op_ref text,
  output_asset_ids uuid[],
  command_id uuid NOT NULL,
  principal text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  UNIQUE (project_id, command_id) -- idempotent enqueue
);

CREATE INDEX IF NOT EXISTS generation_project_status_idx ON gen.generation (project_id, status);
CREATE INDEX IF NOT EXISTS generation_org_created_idx ON gen.generation (organization_id, created_at);
