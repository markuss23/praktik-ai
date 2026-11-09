-- Migration: 0029 - Agent a cena u spotřeby AI tokenů
-- Description: Do ai_usage přidá sloupec agent (klíč system_setting, se kterým
--              se LLM vytvořilo) a cost (cena volání v USD podle ceníku
--              ai_model_price z migrace 0030, počítá se při zápisu).
--              Staré řádky zůstanou s agent = NULL a cost = NULL.
-- Requires existing tables: ai_usage
-- Idempotentní — lze spustit opakovaně, každý krok hlásí RAISE NOTICE.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage' AND column_name = 'agent'
  ) THEN
    ALTER TABLE ai_usage ADD COLUMN agent VARCHAR(100);
    RAISE NOTICE '[0029] Sloupec ai_usage.agent přidán';
  ELSE
    RAISE NOTICE '[0029] Sloupec ai_usage.agent už existuje — přeskočeno';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage' AND column_name = 'cost'
  ) THEN
    ALTER TABLE ai_usage ADD COLUMN cost NUMERIC(12, 6);
    RAISE NOTICE '[0029] Sloupec ai_usage.cost přidán';
  ELSE
    RAISE NOTICE '[0029] Sloupec ai_usage.cost už existuje — přeskočeno';
  END IF;
END $$;
