-- REQ-GEN-020: audio transcription kind + transcript storage on the music brief.
ALTER TABLE gen.generation DROP CONSTRAINT generation_kind_check;
ALTER TABLE gen.generation ADD CONSTRAINT generation_kind_check
  CHECK (kind IN ('script','shot_plan','direction','frame','image_edit','take','retake','music_brief','music','animation','transcript'));
ALTER TABLE stb.music_brief ADD COLUMN transcript text;
