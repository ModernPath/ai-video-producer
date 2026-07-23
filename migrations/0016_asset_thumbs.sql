-- REQ-AST-005 / BR-AST-002: derivative thumbnails (images) and posters (videos) on ready.
ALTER TABLE ast.asset ADD COLUMN thumb_storage_key text;
