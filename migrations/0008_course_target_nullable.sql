-- Migration: 0008 - Cílová skupina kurzu není povinná
-- Description: Podle PRAKTIK-AI_ciselniky.xlsx (list Target) není cílová skupina povinný údaj.
--              course.course_target_id přestává být NOT NULL; existující kurzy si hodnotu ponechají.
-- Requires existing tables: course
-- Idempotentní — lze spustit opakovaně.

ALTER TABLE course ALTER COLUMN course_target_id DROP NOT NULL;
