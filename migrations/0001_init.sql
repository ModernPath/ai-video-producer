-- 0001: PLT + PRJ minimal tables for the Prompt 0B vertical slice.
CREATE SCHEMA IF NOT EXISTS plt;
CREATE SCHEMA IF NOT EXISTS prj;

CREATE TABLE IF NOT EXISTS plt.organization (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prj.project (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES plt.organization(id), -- INV-PRJ-001
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  aspect_ratio text NOT NULL CHECK (aspect_ratio IN ('16:9','9:16')),
  target_duration_s numeric(5,1) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
