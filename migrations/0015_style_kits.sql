-- REQ-AST-007: org-level style kits (styles retained across videos), selectable per project.
CREATE TABLE ast.style_kit (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES plt.organization(id),
  name text NOT NULL,
  prompt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

ALTER TABLE prj.project ADD COLUMN style_kit_id uuid REFERENCES ast.style_kit(id);
