-- 0007: upload sessions (REQ-AST-004, INV-AST-005).
CREATE TABLE IF NOT EXISTS ast.upload_session (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid,
  kind text NOT NULL CHECK (kind IN ('image','audio')),
  mime text NOT NULL,
  declared_bytes integer NOT NULL,
  storage_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
