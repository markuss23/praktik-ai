-- Přidat sloupce jako nullable (aby šlo doplnit existující řádky)
ALTER TABLE pub_resource ADD COLUMN IF NOT EXISTS eqf_level_id BIGINT;
ALTER TABLE pub_resource ADD COLUMN IF NOT EXISTS course_type_id BIGINT;

--  Backfill existujících řádků výchozí hodnotou z číselníku
UPDATE pub_resource
SET eqf_level_id = (SELECT eqf_level_id FROM course_eqf_level WHERE code = '7' LIMIT 1)
WHERE eqf_level_id IS NULL;

UPDATE pub_resource
SET course_type_id = (SELECT type_id FROM course_type WHERE code = 'type.obecny' LIMIT 1)
WHERE course_type_id IS NULL;

-- Nastavit NOT NULL a FK constrainty
ALTER TABLE pub_resource
    ALTER COLUMN eqf_level_id SET NOT NULL,
    ALTER COLUMN course_type_id SET NOT NULL;

ALTER TABLE pub_resource
    ADD CONSTRAINT fk_pub_resource_eqf_level
        FOREIGN KEY (eqf_level_id) REFERENCES course_eqf_level(eqf_level_id),
    ADD CONSTRAINT fk_pub_resource_course_type
        FOREIGN KEY (course_type_id) REFERENCES course_type(type_id);
