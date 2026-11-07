-- Migration: 0029 - Smazání module.max_task_attempts a module.passing_score
-- Description: Pravidla pokusů a prahu žijí v course_assessment.settings (viz 0026).
--              Sloupce na modulu backend už nečte ani nezapisuje.
-- Requires existing tables: module
-- Idempotentní — lze spustit opakovaně.
--
-- Spouštět spolu s nasazením backendu bez těchto polí. Sloupce jsou NOT NULL bez DB defaultu,
-- takže nový backend bez migrace nezaloží modul a starý backend po migraci taky ne.
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0029_module_drop_attempts_passing_score.sql

ALTER TABLE module DROP COLUMN IF EXISTS max_task_attempts;
ALTER TABLE module DROP COLUMN IF EXISTS passing_score;
