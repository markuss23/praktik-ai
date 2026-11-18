-- Migration: 0023 - Mentor chat nad celým kurzem
-- Description: mentor_interaction_log dostane course_id a scope (module/course).
--              Chat se scope=course může běžet i bez learn blocku, proto je learn_id nullable.
--              Historie: module = podle learn_id, course = podle course_id.
--              Stávající řádky: scope=module, course_id dopočítané přes learn_block → module.
-- Requires existing tables: mentor_interaction_log, learn_block, module, course
-- Idempotentní — lze spustit opakovaně.

DO $$ BEGIN CREATE TYPE mentor_scope AS ENUM ('module', 'course'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE mentor_interaction_log
    ADD COLUMN IF NOT EXISTS course_id BIGINT REFERENCES course(course_id),
    ADD COLUMN IF NOT EXISTS scope mentor_scope NOT NULL DEFAULT 'module';

UPDATE mentor_interaction_log l
SET course_id = m.course_id
FROM learn_block lb
JOIN module m ON m.module_id = lb.module_id
WHERE lb.learn_id = l.learn_id AND l.course_id IS NULL;

ALTER TABLE mentor_interaction_log
    ALTER COLUMN course_id SET NOT NULL,
    ALTER COLUMN learn_id DROP NOT NULL;

ALTER TABLE mentor_interaction_log DROP CONSTRAINT IF EXISTS ck_mentor_log_module_needs_learn;
ALTER TABLE mentor_interaction_log
    ADD CONSTRAINT ck_mentor_log_module_needs_learn CHECK (scope = 'course' OR learn_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS ix_mentor_log_user_course ON mentor_interaction_log(user_id, course_id);
