-- Migration: 0022 - Interakční formát socratic_dialog_ai
-- Description: Přidá do katalogu formátů „Sokratovský dialog AI“ — AI z learn blocků vymyslí
--              téma a vede se studentem rozhovor (jen otázky, bez verdiktu, na konci shrnutí).
--              Přidá system_setting „socratic_dialog_ai_topic“ (téma + první otázka),
--              „socratic_dialog_ai“ (tazatel) a „socratic_dialog_ai_summary“ (shrnutí);
--              prompty jsou v api/src/assessments/socratic_dialog_ai/agents/*/prompt.md.
--              Hodnoty odpovídají ASSESSMENT_TYPES a SYSTEM_SETTINGS v seed.py,
--              default_settings = SocraticDialogAISettings().model_dump().
-- Requires existing tables: assessment_type, system_setting
-- Idempotentní — lze spustit opakovaně (existující záznamy se nepřepisují).

INSERT INTO assessment_type (code, name, description, allowed_contexts, default_settings, is_active)
VALUES (
    'socratic_dialog_ai',
    'Sokratovský dialog AI',
    'AI z výukového obsahu vymyslí téma a vede se studentem rozhovor o 2–6 krocích. Jen se ptá, verdikt nevydává; na konci shrne průběh.',
    '["practice", "assessment", "course_final"]'::jsonb,
    '{"min_turns": 2, "max_turns": 4, "start_elo": 1000, "min_elo": 800, "max_elo": 1200, "max_step": 50, "pass_elo": 1200}'::jsonb,
    true
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO system_setting (key, name, model, prompt, description, is_active, created_at)
SELECT 'socratic_dialog_ai_topic',
       'Sokratovský dialog (AI) – téma a první otázka',
       'claude-opus-5-5',
       '',
       'LLM pro výběr tématu sokratovského dialogu z learn blocků modulu a položení první otázky.',
       true,
       now()
WHERE NOT EXISTS (
    SELECT 1 FROM system_setting
    WHERE key = 'socratic_dialog_ai_topic' AND is_active
);

INSERT INTO system_setting (key, name, model, prompt, description, is_active, created_at)
SELECT 'socratic_dialog_ai',
       'Sokratovský dialog (AI) – tazatel',
       'claude-opus-5-5',
       '',
       'LLM, které v sokratovském dialogu ohodnotí odpověď (delta elo) a položí další otázku.',
       true,
       now()
WHERE NOT EXISTS (
    SELECT 1 FROM system_setting
    WHERE key = 'socratic_dialog_ai' AND is_active
);

INSERT INTO system_setting (key, name, model, prompt, description, is_active, created_at)
SELECT 'socratic_dialog_ai_summary',
       'Sokratovský dialog (AI) – shrnutí',
       'claude-opus-5-5',
       '',
       'LLM pro závěrečné shrnutí průběhu sokratovského dialogu (bez verdiktu).',
       true,
       now()
WHERE NOT EXISTS (
    SELECT 1 FROM system_setting
    WHERE key = 'socratic_dialog_ai_summary' AND is_active
);
