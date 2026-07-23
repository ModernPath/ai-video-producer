-- REQ-STB-024: plan-authored animation shots (template + props on the shot).
ALTER TABLE stb.shot ADD COLUMN animation jsonb;
