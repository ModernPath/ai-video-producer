-- REQ-STB-053 (USER 2026-07-27): a SCENE is cast like a character. The canteen was re-invented in
-- every shot set there because nothing held the space fixed; a location entity carries a reference
-- plate, and shots in that scene are conditioned on it.
ALTER TABLE ast.entity DROP CONSTRAINT entity_kind_check;
ALTER TABLE ast.entity ADD CONSTRAINT entity_kind_check
  CHECK (kind = ANY (ARRAY['company'::text, 'product'::text, 'person'::text, 'character'::text, 'location'::text]));
