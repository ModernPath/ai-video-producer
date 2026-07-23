-- 0013: per-shot reference image selection (REQ-STB-016). NULL = whole project cast (default).
ALTER TABLE stb.shot ADD COLUMN IF NOT EXISTS ref_asset_ids uuid[];
