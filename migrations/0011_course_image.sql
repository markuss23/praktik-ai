-- Migration: 0011 - Náhledový obrázek kurzu
-- Description: Cesta k náhledovému obrázku kurzu v SeaweedFS (nahraný z počítače nebo
--              vygenerovaný AI, vždy normalizovaný na 1280×720 WebP). NULL = výchozí obrázek.
-- Requires existing tables: course
-- Idempotentní — lze spustit opakovaně.

ALTER TABLE course ADD COLUMN IF NOT EXISTS image_path VARCHAR(500);
