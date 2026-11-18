-- Migration: 0012 - Odstranění assessment_session.settings_snapshot
-- Description: Nastavení testu se čte živě z course_assessment.settings,
--              snapshot při startu session už se nepoužívá.
-- Requires existing tables: assessment_session
-- Idempotentní — lze spustit opakovaně.

ALTER TABLE assessment_session DROP COLUMN IF EXISTS settings_snapshot;
