-- REQ-AST-012 (USER 2026-07-24): long-form brand/company profile — feeds TEXT prompts
-- (script/plan/music) as marketing context; the short description keeps feeding visual prompts.
ALTER TABLE ast.entity ADD COLUMN IF NOT EXISTS profile text;
