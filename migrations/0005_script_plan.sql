-- 0005: script studio (REQ-STB-008/011) — brief on project, text outputs on generation,
-- stb.script_version + stb.shot_plan_proposal.
ALTER TABLE prj.project ADD COLUMN IF NOT EXISTS brief jsonb NOT NULL DEFAULT '{}';
ALTER TABLE gen.generation ADD COLUMN IF NOT EXISTS output jsonb;

CREATE TABLE IF NOT EXISTS stb.script_version (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES prj.project(id),
  version integer NOT NULL,
  content text NOT NULL,
  source text NOT NULL DEFAULT 'drafted' CHECK (source IN ('drafted','revised','manual')),
  generation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE TABLE IF NOT EXISTS stb.shot_plan_proposal (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES prj.project(id),
  script_version_id uuid REFERENCES stb.script_version(id),
  changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','applied','discarded')),
  generation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
