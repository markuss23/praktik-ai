-- Migration: 0017 - Pretest (kontext i interakční formát)
-- Description: Nový první stupeň prerekvizit pretest -> practice -> assessment -> course_final.
--              Formát pretest bere otázky z practice_question modulu (generátor kurzu vždy
--              uloží 2 uzavřené + 1 otevřenou) a je pevně daný (default_settings = {}).
--              Hodnoty odpovídají ASSESSMENT_TYPES v seed.py.
-- Requires existing tables: course_assessment, assessment_type; typ assessment_context
-- Idempotentní — lze spustit opakovaně.
--
-- POZOR: novou hodnotu enumu nejde použít ve stejné transakci, ve které vznikla.
-- Krok 1 proto musí být commitnutý dřív než kroky 2–3 — nespouštět soubor
-- v jedné transakci (psql bez --single-transaction / -1).

-- 1) Nová hodnota kontextu
ALTER TYPE assessment_context ADD VALUE IF NOT EXISTS 'pretest' BEFORE 'practice';

-- 2) Pretest je modulový kontext — vyžaduje module_id
ALTER TABLE course_assessment DROP CONSTRAINT IF EXISTS ck_course_assessment_context_module;
ALTER TABLE course_assessment ADD CONSTRAINT ck_course_assessment_context_module CHECK (
    (context = 'course_final' AND module_id IS NULL)
    OR
    (context IN ('pretest', 'practice', 'assessment') AND module_id IS NOT NULL)
);

-- 3) Formát v katalogu
INSERT INTO assessment_type (code, name, description, allowed_contexts, default_settings, is_active)
VALUES (
    'pretest',
    'Pretest',
    'Pevně daný test modulu z otázek vygenerovaných s kurzem (2 uzavřené + 1 otevřená); lektor upravuje jen jejich znění. Odemyká practice.',
    '["pretest"]'::jsonb,
    '{}'::jsonb,
    true
)
ON CONFLICT (code) DO NOTHING;
