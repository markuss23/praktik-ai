-- Migration: 0020 - Prompty AI mentora v souborech a levnější modely
-- Description: Prompty mentora jsou nově v agents/mentor/prompt.md (odpověď) a
--              agents/mentor/reranker_prompt.md (reranker), stejně jako u assessmentů.
--              V system_setting zůstává jen model; prompt se vyprázdní.
--              Pozor: prompty upravené superadminem v DB se tím zahodí.
--              Hodnoty odpovídají SYSTEM_SETTINGS v seed.py.
-- Requires existing tables: system_setting
-- Idempotentní — lze spustit opakovaně.

UPDATE system_setting
SET prompt = ''
WHERE key IN ('mentor_answer', 'mentor_reranker')
  AND is_active
  AND prompt <> '';

-- Levnější modely: reranker jen řadí čísla dokumentů, odpověď je krátký chat.
-- Mění se jen výchozí Opus — model zvolený superadminem zůstává.
UPDATE system_setting
SET model = 'claude-haiku-5-5'
WHERE key = 'mentor_reranker' AND is_active AND model = 'claude-opus-5-5';

UPDATE system_setting
SET model = 'claude-sonnet-5-5'
WHERE key = 'mentor_answer' AND is_active AND model = 'claude-opus-5-5';
