-- Migration: 0033 - Myšlenková mapa modulu
-- Description: Strom myšlenkové mapy {root, branches: [{label, children}]} generovaný AI.
-- Requires existing tables: module
-- Idempotentní — lze spustit opakovaně.
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0033_module_mindmap.sql

ALTER TABLE module ADD COLUMN IF NOT EXISTS mindmap JSONB;
