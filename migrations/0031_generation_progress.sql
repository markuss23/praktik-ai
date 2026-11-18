-- Migration: 0031 - Společný průběh generování kurzu i obrázků
-- Description: Průběh obrázků se držel v paměti procesu, takže při více workerech gunicornu
--              polling trefil worker, který o generování nevěděl. course_generation_progress
--              se zobecní na generation_progress s klíčem course:<id> / course-image:<id> /
--              module-image:<id> a sloupcem result (výsledek generování obrázku).
-- Requires existing tables: course_generation_progress (0010)
-- Idempotentní — lze spustit opakovaně.
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0031_generation_progress.sql

DO $$
BEGIN
  IF to_regclass('generation_progress') IS NULL THEN
    ALTER TABLE course_generation_progress RENAME TO generation_progress;
    ALTER TABLE generation_progress ADD COLUMN key VARCHAR(64);
    UPDATE generation_progress SET key = 'course:' || course_id;
    -- Spolu se sloupcem zmizí i PK a FK na course.
    ALTER TABLE generation_progress DROP COLUMN course_id;
    ALTER TABLE generation_progress ALTER COLUMN key SET NOT NULL;
    ALTER TABLE generation_progress ADD PRIMARY KEY (key);
    ALTER TABLE generation_progress ADD COLUMN result JSONB;
  END IF;
END $$;
