-- Migration: 0003 - Course block optional + Module perex + Neuro principles backfill
-- Description:
--   1) course.course_block_id se stává nepovinným (dle aktualizovaného číselníku "Blok")
--   2) course_block.code se přejmenovává na formát "blok.x" (sladěno s ostatními číselníky)
--   3) module.perex - nový sloupec pro krátkou anotaci modulu
--   4) module_neuro_principle - backfill existujících modulů výchozím principem
-- Requires existing tables: course, course_block, module
-- Spouštěj AŽ PO deploy nového kódu (create_all + seed_db musí už vytvořit
-- a naseedovat tabulky neuro_principle / module_neuro_principle).

-- ─── 1) COURSE_BLOCK: přejmenování kódů ───────────────────────

UPDATE course_block SET code = 'blok.a' WHERE code = 'a';
UPDATE course_block SET code = 'blok.b' WHERE code = 'b';
UPDATE course_block SET code = 'blok.c' WHERE code = 'c';

-- ─── 2) COURSE: course_block_id nepovinný ─────────────────────

ALTER TABLE course ALTER COLUMN course_block_id DROP NOT NULL;

-- ─── 3) MODULE: nový sloupec perex ────────────────────────────

ALTER TABLE module ADD COLUMN IF NOT EXISTS perex VARCHAR(255) NOT NULL DEFAULT '';

-- ─── 4) MODULE_NEURO_PRINCIPLE: backfill existujících modulů ──
-- Pole neuro_principle_ids je na API výstupu povinné (min. 1 princip).
-- Bez backfillu by GET na moduly bez principu spadl na validaci.

INSERT INTO module_neuro_principle (module_id, principle_id, is_active)
SELECT m.module_id, (SELECT principle_id FROM neuro_principle WHERE code = 'NP-01' LIMIT 1), true
FROM module m
WHERE NOT EXISTS (
    SELECT 1 FROM module_neuro_principle mnp
    WHERE mnp.module_id = m.module_id AND mnp.is_active = true
);
