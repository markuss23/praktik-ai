-- Migration: 0032 - Podcast modulu
-- Description: Cesta k vygenerovanému audiu (WAV) v SeaweedFS a přepis podcastu [{speaker, text}].
-- Requires existing tables: module
-- Idempotentní — lze spustit opakovaně.
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0032_module_podcast.sql

ALTER TABLE module ADD COLUMN IF NOT EXISTS podcast_path VARCHAR(500);
ALTER TABLE module ADD COLUMN IF NOT EXISTS podcast_transcript JSONB;
