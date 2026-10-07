-- Migration: 0009 - Obor (školní předmět) jen u kurzů Bloku C
-- Description: Podle PRAKTIK-AI_ciselniky.xlsx (list Obor) se obor volí pouze u Bloku C.
--              Backend od teď obor u jiných bloků (i u kurzu bez bloku) odmítne, takže ho
--              u takových kurzů vynulujeme — jinak by jejich úprava končila chybou 400.
--              Průřezové obory u Bloku C nově povolené jsou (doplňkové), nic se nemaže.
-- Requires existing tables: course, course_block
-- Idempotentní — lze spustit opakovaně.

UPDATE course c
SET course_subject_id = NULL
WHERE c.course_subject_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM course_block b
      WHERE b.block_id = c.course_block_id AND b.code = 'blok.c'
  );
