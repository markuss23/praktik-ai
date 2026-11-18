-- Migration: 0021 - Router AI mentora
-- Description: Nový krok mentora (agents/mentor/nodes/route_query.py) rozhodne, jestli je
--              potřeba hledat ve vektorovém úložišti, a přepíše navazující otázku na samostatnou.
--              Přidá system_setting „mentor_router“ s modelem; prompt je v agents/mentor/router_prompt.md.
--              Hodnoty odpovídají SYSTEM_SETTINGS v seed.py.
-- Requires existing tables: system_setting
-- Idempotentní — lze spustit opakovaně.

INSERT INTO system_setting (key, name, model, prompt, description, is_active, created_at)
SELECT 'mentor_router',
       'Mentor – router',
       'claude-haiku-5-5',
       '',
       'LLM, které rozhodne, jestli mentor potřebuje hledat v materiálech, a přepíše navazující otázku na samostatnou.',
       true,
       now()
WHERE NOT EXISTS (
    SELECT 1 FROM system_setting
    WHERE key = 'mentor_router' AND is_active
);
