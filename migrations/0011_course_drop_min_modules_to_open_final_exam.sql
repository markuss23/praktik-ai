-- Migration: 0011 - Odstranění course.min_modules_to_open_final_exam
-- Description: Zpřístupnění závěrečného testu teď řídí gate hierarchie povinných
--              testů v assessment systému (start_session), sloupec už model nezná.
--              Zůstal NOT NULL bez defaultu, takže vkládání nových kurzů padalo.
-- Requires existing tables: course
-- Idempotentní — lze spustit opakovaně.

ALTER TABLE course DROP COLUMN IF EXISTS min_modules_to_open_final_exam;
