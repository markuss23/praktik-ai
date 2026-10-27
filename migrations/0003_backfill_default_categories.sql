-- Migration: 0003 - Výchozí pedagogické kategorie pro kurzy a moduly vzniklé před jejich zavedením
-- Samostatný a idempotentní skript (lze pustit opakovaně; doplňuje jen tam, kde nic aktivního není).
-- Spouštět až po 0002 (ta zakládá číselníky a modulům doplňuje neurovědní princip NP-01).
--
-- Backend od 0002 vyžaduje u každého kurzu alespoň jednu KRAUU kompetenci a Bloomovu
-- úroveň (Blok A/B navíc průřezový obor) a u modulu totéž — starší data je nemají,
-- takže každá jejich úprava končí 422/400. Všem se doplní stejné výchozí hodnoty:
--
--   A) kurzy bez KRAUU kompetence        → 6.2  Odpovědná práce s informacemi a digitálními nástroji
--   B) kurzy bez Bloomovy úrovně         → 2    Porozumět
--   C) kurzy Bloku A/B bez průřez. oboru → O001 AI gramotnost – technický základ
--      (Blok C průřezové obory mít nesmí, kurzy bez bloku je mít nemusí)
--   D) moduly bez KRAUU kompetence       → KRAUU kompetence svého kurzu
--   E) moduly bez Bloomovy úrovně        → Bloomovy úrovně svého kurzu
--      (stejné pravidlo jako frontend u nových modulů; po A/B je má každý kurz)
--
-- Týká se i neaktivních (soft-deleted) kurzů a modulů, aby byla data jednotná.

-- ─── Kontrola, že výchozí položky v číselnících existují ─────
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM krauu_competence WHERE code = '6.2' AND is_active AND parent_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Chybí aktivní KRAUU kompetence 6.2 — nejdřív pusťte 0002';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM bloom_level WHERE code = '2' AND is_active) THEN
        RAISE EXCEPTION 'Chybí aktivní Bloomova úroveň 2 — nejdřív pusťte 0002';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM cross_subject WHERE code = 'O001' AND is_active) THEN
        RAISE EXCEPTION 'Chybí aktivní průřezový obor O001 — nejdřív pusťte 0002';
    END IF;
END $$;

-- ─── A) KURZY: KRAUU ─────────────────────────────────────────
-- ON CONFLICT: kurz může mít stejnou vazbu jako neaktivní (soft delete) — reaktivujeme ji.
INSERT INTO course_krauu_competence (course_id, krauu_id, is_active)
SELECT c.course_id,
       (SELECT krauu_id FROM krauu_competence WHERE code = '6.2' AND is_active AND parent_id IS NOT NULL LIMIT 1),
       true
FROM course c
WHERE NOT EXISTS (
    SELECT 1 FROM course_krauu_competence x
    WHERE x.course_id = c.course_id AND x.is_active
)
ON CONFLICT (course_id, krauu_id) DO UPDATE SET is_active = true;

-- ─── B) KURZY: Bloom ─────────────────────────────────────────
INSERT INTO course_bloom_level (course_id, bloom_id, is_active)
SELECT c.course_id,
       (SELECT bloom_id FROM bloom_level WHERE code = '2' AND is_active LIMIT 1),
       true
FROM course c
WHERE NOT EXISTS (
    SELECT 1 FROM course_bloom_level x
    WHERE x.course_id = c.course_id AND x.is_active
)
ON CONFLICT (course_id, bloom_id) DO UPDATE SET is_active = true;

-- ─── C) KURZY BLOKU A/B: průřezový obor ──────────────────────
INSERT INTO course_cross_subject (course_id, cross_id, is_active)
SELECT c.course_id,
       (SELECT cross_id FROM cross_subject WHERE code = 'O001' AND is_active LIMIT 1),
       true
FROM course c
JOIN course_block b ON b.block_id = c.course_block_id
WHERE b.code IN ('blok.a', 'blok.b')
  AND NOT EXISTS (
    SELECT 1 FROM course_cross_subject x
    WHERE x.course_id = c.course_id AND x.is_active
)
ON CONFLICT (course_id, cross_id) DO UPDATE SET is_active = true;

-- ─── D) MODULY: KRAUU z kurzu ────────────────────────────────
INSERT INTO module_krauu_competence (module_id, krauu_id, is_active)
SELECT m.module_id, ck.krauu_id, true
FROM module m
JOIN course_krauu_competence ck ON ck.course_id = m.course_id AND ck.is_active
WHERE NOT EXISTS (
    SELECT 1 FROM module_krauu_competence x
    WHERE x.module_id = m.module_id AND x.is_active
)
ON CONFLICT (module_id, krauu_id) DO UPDATE SET is_active = true;

-- ─── E) MODULY: Bloom z kurzu ────────────────────────────────
INSERT INTO module_bloom_level (module_id, bloom_id, is_active)
SELECT m.module_id, cb.bloom_id, true
FROM module m
JOIN course_bloom_level cb ON cb.course_id = m.course_id AND cb.is_active
WHERE NOT EXISTS (
    SELECT 1 FROM module_bloom_level x
    WHERE x.module_id = m.module_id AND x.is_active
)
ON CONFLICT (module_id, bloom_id) DO UPDATE SET is_active = true;
