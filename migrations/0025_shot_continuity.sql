-- REQ-STB-054 (USER 2026-07-27): "the clothing and positions of persons sitting are changing…
-- store the last frame of video as reference starting image for next clip? They should be
-- considered as sub-clips for the main clip, so we can see the dependency and continue as the
-- video for first is generated."
--
-- A shot may CONTINUE another: same moment, same bodies, camera keeps rolling. Its start frame is
-- the previous shot's last frame, so the chain must be explicit and visible.
ALTER TABLE stb.shot ADD COLUMN continues_from_shot_id uuid REFERENCES stb.shot(id);
