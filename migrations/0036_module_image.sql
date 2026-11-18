-- Migration: 0036 - Obrázek modulu
-- Description: Cesta k vygenerovanému obrázku modulu v SeaweedFS (module-images/<id>/image.<ext>).
-- Requires existing tables: module
-- Idempotentní — lze spustit opakovaně.
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0036_module_image.sql

ALTER TABLE module ADD COLUMN IF NOT EXISTS image_path VARCHAR(500);
