-- Migration: 0016 - Interakční formát closed_questions_ai
-- Description: Přidá do katalogu formátů „Uzavřené otázky generované AI“ — AI při startu
--              session vygeneruje sadu uzavřených otázek z learn blocků modulu (u course_final
--              všech modulů kurzu), vyhodnocení je bez LLM. Plus system_setting s modelem
--              generátoru (prompt je v kódu, prompt.md). Hodnoty odpovídají ASSESSMENT_TYPES
--              a SYSTEM_SETTINGS v seed.py, default_settings = ClosedQuestionsAISettings().model_dump().
-- Requires existing tables: assessment_type, system_setting
-- Idempotentní — lze spustit opakovaně (existující záznamy se nepřepisují).

INSERT INTO assessment_type (code, name, description, allowed_contexts, default_settings, is_active)
VALUES (
    'closed_questions_ai',
    'Uzavřené otázky generované AI',
    'AI vygeneruje z výukového obsahu sadu uzavřených otázek; vyhodnocení bez LLM jako u uzavřených otázek.',
    '["practice", "assessment", "course_final"]'::jsonb,
    '{"question_count": 5, "max_attempts": 3, "pass_threshold": 0.75}'::jsonb,
    true
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO system_setting (key, name, model, prompt, description, is_active, created_at)
SELECT 'closed_questions_ai',
       'Assessment – uzavřené otázky (AI)',
       'claude-opus-5-5',
       '',
       'LLM pro generování sady uzavřených otázek z výukového obsahu modulu/kurzu.',
       true,
       now()
WHERE NOT EXISTS (
    SELECT 1 FROM system_setting
    WHERE key = 'closed_questions_ai' AND is_active
);
