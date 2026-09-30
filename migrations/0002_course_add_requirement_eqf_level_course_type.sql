-- Přidat sloupce jako nullable (aby šlo doplnit existující řádky)
ALTER TABLE course ADD COLUMN IF NOT EXISTS course_requirement_id BIGINT;
ALTER TABLE course ADD COLUMN IF NOT EXISTS course_eqf_level_id BIGINT;
ALTER TABLE course ADD COLUMN IF NOT EXISTS course_type_id BIGINT;

--  Backfill existujících řádků výchozí hodnotou z číselníku
UPDATE course
SET course_eqf_level_id = (SELECT eqf_level_id FROM course_eqf_level WHERE code = '7' LIMIT 1)
WHERE course_eqf_level_id IS NULL;

UPDATE course
SET course_type_id = (SELECT type_id FROM course_type WHERE code = 'type.obecny' LIMIT 1)
WHERE course_type_id IS NULL;

-- Nastavit NOT NULL a FK constrainty (course_requirement_id zůstává nullable)
ALTER TABLE course
    ALTER COLUMN course_eqf_level_id SET NOT NULL,
    ALTER COLUMN course_type_id SET NOT NULL;

ALTER TABLE course
    ADD CONSTRAINT course_course_requirement_id_fkey
        FOREIGN KEY (course_requirement_id) REFERENCES course_requirement(requirement_id),
    ADD CONSTRAINT course_course_eqf_level_id_fkey
        FOREIGN KEY (course_eqf_level_id) REFERENCES course_eqf_level(eqf_level_id),
    ADD CONSTRAINT course_course_type_id_fkey
        FOREIGN KEY (course_type_id) REFERENCES course_type(type_id);
