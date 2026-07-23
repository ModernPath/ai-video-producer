-- 0014: ASM share links (REQ-ASM-007 / INV-ASM-005) — token-scoped, revocable, optional expiry.
CREATE TABLE IF NOT EXISTS asm.share_link (
  id uuid PRIMARY KEY,
  export_job_id uuid NOT NULL REFERENCES asm.export_job(id),
  token text UNIQUE NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
