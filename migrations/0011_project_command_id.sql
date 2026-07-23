-- 0011: idempotent project creation (REQ-PRJ-002).
ALTER TABLE prj.project ADD COLUMN IF NOT EXISTS command_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS project_org_command_idx ON prj.project (organization_id, command_id) WHERE command_id IS NOT NULL;
