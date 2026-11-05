-- Migration: 0010 - Image generátor: obrázkový model v system_setting
-- Description: Image generátor (cover kurzu, obrázek modulu) už nebere seznam modelů
--              z requestu, ale jeden konkrétní OpenAI image model z DB. Čte ho ze sloupce
--              `model` záznamu system_setting s klíčem 'image_generator_model'; sloupec
--              `prompt` se u tohoto klíče nepoužívá (je prázdný). Pokud záznam chybí,
--              backend použije výchozí 'gpt-image-2'. Hodnota odpovídá SYSTEM_SETTINGS v seed.py.
-- Requires existing tables: system_setting
-- Idempotentní — lze spustit opakovaně (existující záznam se nepřepisuje).

INSERT INTO system_setting (key, name, model, prompt, description, is_active, created_at)
SELECT 'image_generator_model',
       'Image generátor – obrázkový model',
       'gpt-image-2',
       '',
       'OpenAI image model (gpt-image-* nebo chatgpt-image-latest) pro generování coveru kurzu a obrázků modulů. Používá se jen sloupec model; prompt je prázdný, textový prompt sestavuje LLM podle image_generator_prompt / module_image_generator_prompt.',
       true,
       now()
WHERE NOT EXISTS (
    SELECT 1 FROM system_setting
    WHERE key = 'image_generator_model' AND is_active
);
