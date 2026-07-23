-- 0006: music brief (REQ-STB-010, Suno handoff docs/17 §1).
CREATE TABLE IF NOT EXISTS stb.music_brief (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL UNIQUE REFERENCES prj.project(id),
  prompt text NOT NULL,
  generation_id uuid,
  active_track_asset_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
