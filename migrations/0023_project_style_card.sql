-- SR-DIR-008 (EPIC-STB-001): a Style Card compiled from a free-form director brief lives on the
-- project. `archetype` keeps holding one of the six seed keys; exactly one of the two is set.
ALTER TABLE prj.project ADD COLUMN style_card jsonb;
