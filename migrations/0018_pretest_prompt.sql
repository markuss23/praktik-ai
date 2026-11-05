-- Migration: 0018 - Vlastní prompt pretestu
-- Description: Otázky pretestu generuje samostatné volání s promptem
--              api/src/assessments/pretest/prompt.md (lehký concept check). Přidá system_setting
--              „pretest“ s modelem a z promptu course_module_enricher odstraní oddíl OTÁZKY —
--              enricher už jen zařazuje do číselníků. Ostatní části promptu enricheru (i lektorské
--              úpravy) zůstávají. Hodnoty odpovídají SYSTEM_SETTINGS v seed.py.
-- Requires existing tables: system_setting
-- Idempotentní — lze spustit opakovaně.

INSERT INTO system_setting (key, name, model, prompt, description, is_active, created_at)
SELECT 'pretest',
       'Pretest – otázky modulu',
       'claude-opus-5-5',
       '',
       'LLM pro generování lehkého pretestu (2 uzavřené + 1 otevřená otázka) při generování kurzu.',
       true,
       now()
WHERE NOT EXISTS (
    SELECT 1 FROM system_setting
    WHERE key = 'pretest' AND is_active
);

UPDATE system_setting
SET prompt = replace(
        replace(
            left(prompt, strpos(prompt, E'\n\nOTÁZKY (procvičování') - 1),
            'urči zařazení do číselníků a vytvoř otázky k procvičování. ',
            'urči zařazení do číselníků. '
        ),
        E'Pole vyplňuj v daném pořadí: nejdřív číselníky, potom otázky.\n',
        ''
    ),
    name = 'Číselníky modulu',
    description = 'LLM pro zařazení hotového modulu do číselníků NP, KRAUU a Bloom.'
WHERE key = 'course_module_enricher'
  AND is_active
  AND strpos(prompt, E'\n\nOTÁZKY (procvičování') > 0;
