-- Migration: 0027 - Smazání tabulek starého systému procvičování a AI úkolu
-- Spouštět až po 0026 (data jsou převedená do assessments) a s backendem bez
-- deprecated endpointů (modely PracticeQuestion, ModuleTaskSession aj. jsou pryč).
--
-- Nevratné — předtím zálohovat:
--   docker exec praktik-ai-db-1 sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t practice_question -t practice_option -t question_keyword -t user_practice_question -t user_practice_attempt -t module_task_session -t task_attempt' > legacy_backup.sql
--
-- Bez CASCADE: kdyby na tabulky ještě něco odkazovalo, migrace spadne místo
-- tichého zahození cizích klíčů.
-- module.max_task_attempts / passing_score zůstávají — frontend je zatím posílá.
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0027_drop_legacy_practice_and_task.sql

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM course_assessment
        WHERE context = 'assessment' AND assessment_type_code = 'open_question_ai'
    ) THEN
        RAISE EXCEPTION 'Chybí převedená data — nejdřív pusťte 0026';
    END IF;
END $$;

DROP TABLE IF EXISTS
    task_attempt,
    module_task_session,
    user_practice_attempt,
    user_practice_question,
    practice_option,
    question_keyword,
    practice_question;

DROP TYPE IF EXISTS attempt_status, module_task_session_status, question_type;
