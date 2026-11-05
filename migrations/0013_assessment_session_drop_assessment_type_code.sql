-- Migration: 0013 - Odstranění assessment_session.assessment_type_code
-- Description: Kód formátu se bere z course_assessment.assessment_type_code,
--              denormalizovaná kopie na session byla zbytečná.
-- Requires existing tables: assessment_session
-- Idempotentní — lze spustit opakovaně.

ALTER TABLE assessment_session DROP COLUMN IF EXISTS assessment_type_code;
