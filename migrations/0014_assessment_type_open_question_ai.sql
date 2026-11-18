-- Migration: 0014 - Interakční formát open_question_ai v assessment_type
-- Description: Přidá do katalogu formátů „Otevřené otázky generované AI“ — AI vygeneruje
--              otázku z kontextu a vyhodnotí odpověď. Hodnoty odpovídají ASSESSMENT_TYPES
--              v seed.py, default_settings = OpenQuestionAISettings().model_dump().
-- Requires existing tables: assessment_type
-- Idempotentní — lze spustit opakovaně (existující záznam se nepřepisuje).

INSERT INTO assessment_type (code, name, description, allowed_contexts, default_settings, is_active)
VALUES (
    'open_question_ai',
    'Otevřené otázky generované AI',
    'AI vygeneruje na zaklade contextu otázku a tu pak i vyhodnotí',
    '["practice", "assessment", "course_final"]'::jsonb,
    '{"max_attempts": 3, "pass_threshold": 0.75}'::jsonb,
    true
)
ON CONFLICT (code) DO NOTHING;
