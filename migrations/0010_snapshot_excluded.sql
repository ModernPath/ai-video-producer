-- 0010: exclusion provenance on snapshots (REQ-ASM-008).
ALTER TABLE asm.storyboard_snapshot ADD COLUMN IF NOT EXISTS excluded jsonb NOT NULL DEFAULT '[]';
