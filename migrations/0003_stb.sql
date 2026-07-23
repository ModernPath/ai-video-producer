-- 0003: STB shot, frame_candidate, take (REQ-STB-001..004).
CREATE SCHEMA IF NOT EXISTS stb;

CREATE TABLE IF NOT EXISTS stb.shot (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES prj.project(id),
  position integer NOT NULL,
  title text NOT NULL,
  direction jsonb NOT NULL,
  duration_s numeric(4,1) NOT NULL,
  selected_start_frame_id uuid,
  selected_end_frame_id uuid,
  selected_take_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (project_id, position) -- INV-STB-002
);

CREATE TABLE IF NOT EXISTS stb.frame_candidate (
  id uuid PRIMARY KEY,
  shot_id uuid NOT NULL REFERENCES stb.shot(id),
  slot text NOT NULL CHECK (slot IN ('start','end')),
  image_asset_id uuid NOT NULL,
  generation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS stb.take (
  id uuid PRIMARY KEY,
  shot_id uuid NOT NULL REFERENCES stb.shot(id),
  video_asset_id uuid NOT NULL,
  generation_id uuid NOT NULL,
  retake_of uuid,
  duration_actual_s numeric(4,1),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
