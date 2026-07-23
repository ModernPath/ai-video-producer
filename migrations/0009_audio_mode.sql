-- 0009: audio mix mode on project (REQ-ASM-004, BR-ASM-001).
ALTER TABLE prj.project ADD COLUMN IF NOT EXISTS audio_mix_mode text NOT NULL DEFAULT 'native'
  CHECK (audio_mix_mode IN ('native','music','mix'));
