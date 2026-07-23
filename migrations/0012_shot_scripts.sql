-- 0012: per-shot explicit prompts (REQ-STB-013, USER feedback).
ALTER TABLE stb.shot ADD COLUMN IF NOT EXISTS image_prompt text;
ALTER TABLE stb.shot ADD COLUMN IF NOT EXISTS video_prompt text;
