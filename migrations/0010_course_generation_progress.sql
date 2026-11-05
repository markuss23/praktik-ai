-- Migration: 0010 - Průběh AI generování kurzu v DB
-- Description: Průběh generování se dřív držel v paměti procesu, takže při více workerech
--              gunicornu polling trefil worker, který o generování nevěděl.
-- Requires existing tables: course
-- Idempotentní — lze spustit opakovaně.

CREATE TABLE IF NOT EXISTS course_generation_progress (
  course_id BIGINT PRIMARY KEY REFERENCES course(course_id) ON DELETE CASCADE,
  step INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 5,
  label VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
