-- Migration: 0015 - Přejmenování assessment_session.result na state
-- Description: Sloupec nese průběžný stav běhu formátu (např. index aktuální otázky),
--              ne výsledek testu — ten je ve score/is_passed. Název sjednocen s kódem
--              (State schémata formátů, initial_state).
-- Requires existing tables: assessment_session
-- Idempotentní — lze spustit opakovaně.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assessment_session' AND column_name = 'result'
    ) THEN
        ALTER TABLE assessment_session RENAME COLUMN result TO state;
    END IF;
END $$;
