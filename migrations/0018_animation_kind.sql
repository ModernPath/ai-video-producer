-- REQ-ANM-001: generation kind 'animation' (local Remotion render — free).
ALTER TABLE gen.generation DROP CONSTRAINT generation_kind_check;
ALTER TABLE gen.generation ADD CONSTRAINT generation_kind_check
  CHECK (kind IN ('script','shot_plan','direction','frame','image_edit','take','retake','music_brief','music','animation'));
