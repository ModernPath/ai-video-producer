-- 0008: entity library (REQ-AST-006, INV-AST-004/006).
CREATE TABLE IF NOT EXISTS ast.entity (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES plt.organization(id),
  kind text NOT NULL CHECK (kind IN ('company','product','person','character')),
  name text NOT NULL,
  description text NOT NULL,
  ref_asset_ids uuid[] NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ast.project_entity (
  project_id uuid NOT NULL REFERENCES prj.project(id),
  entity_id uuid NOT NULL REFERENCES ast.entity(id),
  PRIMARY KEY (project_id, entity_id)
);
