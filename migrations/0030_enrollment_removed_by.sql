-- Migration: 0030 - Kdo vyřadil studenta z kurzu
-- Description: Odepsaný zápis jde obnovit. Po leave smí student sám, po remove (vyřazení
--              lektorem) jen garant nebo superadmin. removed_by_id to rozliší.
--              Stará vyřazení nejdou zpětně rozlišit, berou se jako leave.
-- Requires existing tables: enrollment, "user"
-- Idempotentní — lze spustit opakovaně.
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0030_enrollment_removed_by.sql

ALTER TABLE enrollment
  ADD COLUMN IF NOT EXISTS removed_by_id BIGINT REFERENCES "user"(user_id);
