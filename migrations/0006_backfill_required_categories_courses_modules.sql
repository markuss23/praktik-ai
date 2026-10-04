-- Migration: 0006 - Doplnění povinných pedagogických kategorií všem kurzům a modulům
-- Samostatný a idempotentní skript (lze pustit opakovaně; doplňuje jen tam, kde nic aktivního není).
-- Spouštět až po 0005 (ta přejmenovala kódy průřezových oborů O001 → O01).
--
-- Backend vyžaduje u každého kurzu alespoň jednu KRAUU kompetenci a Bloomovu úroveň
-- (Blok A/B navíc průřezový obor) a u modulu neurovědní princip, KRAUU kompetenci
-- a Bloomovu úroveň. Bez nich každá úprava kurzu/modulu končí 422/400 a kurz nejde
-- editovat. Migrace 0003 doplnila data z doby před zavedením kategorií; tahle navíc
-- pokrývá moduly vygenerované AI, kterým se kategorie nenapojily (kódy z LLM
-- neodpovídaly číselníku), a funguje i s novými kódy oborů po 0005.
--
-- Výchozí hodnoty (stejné jako v 0003 a ve frontendu u ručně založeného modulu):
--   A) kurzy bez KRAUU kompetence        → 6.2  Odpovědná práce s informacemi a demokratické hodnoty
--   B) kurzy bez Bloomovy úrovně         → 2    Porozumět
--   C) kurzy Bloku A/B bez průřez. oboru → O01  AI gramotnost – technický základ (O001 před 0005)
--      (Blok C průřezové obory mít nesmí, kurzy bez bloku je mít nemusí)
--   D) moduly bez neurovědního principu  → NP-01 Neuroplasticita
--   E) moduly bez KRAUU kompetence       → KRAUU kompetence svého kurzu
--   F) moduly bez Bloomovy úrovně        → Bloomovy úrovně svého kurzu
--
-- Týká se i neaktivních (soft-deleted) kurzů a modulů, aby byla data jednotná.
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0006_backfill_required_categories_courses_modules.sql

-- ─── Kontrola, že výchozí položky v číselnících existují ─────
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM krauu_competence WHERE code = '6.2' AND is_active AND parent_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Chybí aktivní KRAUU kompetence 6.2 — nejdřív pusťte 0002 a 0005';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM bloom_level WHERE code = '2' AND is_active) THEN
        RAISE EXCEPTION 'Chybí aktivní Bloomova úroveň 2 — nejdřív pusťte 0002';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM cross_subject WHERE code IN ('O01', 'O001') AND is_active) THEN
        RAISE EXCEPTION 'Chybí aktivní průřezový obor O01 — nejdřív pusťte 0002 a 0005';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM neuro_principle WHERE code = 'NP-01' AND is_active) THEN
        RAISE EXCEPTION 'Chybí aktivní neurovědní princip NP-01 — nejdřív pusťte 0002';
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
       (SELECT cross_id FROM cross_subject WHERE code IN ('O01', 'O001') AND is_active ORDER BY code LIMIT 1),
       true
FROM course c
JOIN course_block b ON b.block_id = c.course_block_id
WHERE b.code IN ('blok.a', 'blok.b')
  AND NOT EXISTS (
    SELECT 1 FROM course_cross_subject x
    WHERE x.course_id = c.course_id AND x.is_active
)
ON CONFLICT (course_id, cross_id) DO UPDATE SET is_active = true;

-- ─── D) MODULY: neurovědní princip ───────────────────────────
INSERT INTO module_neuro_principle (module_id, principle_id, is_active)
SELECT m.module_id,
       (SELECT principle_id FROM neuro_principle WHERE code = 'NP-01' AND is_active LIMIT 1),
       true
FROM module m
WHERE NOT EXISTS (
    SELECT 1 FROM module_neuro_principle x
    WHERE x.module_id = m.module_id AND x.is_active
)
ON CONFLICT (module_id, principle_id) DO UPDATE SET is_active = true;

-- ─── E) MODULY: KRAUU z kurzu ────────────────────────────────
-- Po A) má každý kurz aspoň jednu aktivní kompetenci, takže nikdo nezůstane prázdný.
INSERT INTO module_krauu_competence (module_id, krauu_id, is_active)
SELECT m.module_id, ck.krauu_id, true
FROM module m
JOIN course_krauu_competence ck ON ck.course_id = m.course_id AND ck.is_active
WHERE NOT EXISTS (
    SELECT 1 FROM module_krauu_competence x
    WHERE x.module_id = m.module_id AND x.is_active
)
ON CONFLICT (module_id, krauu_id) DO UPDATE SET is_active = true;

-- ─── F) MODULY: Bloom z kurzu ────────────────────────────────
INSERT INTO module_bloom_level (module_id, bloom_id, is_active)
SELECT m.module_id, cb.bloom_id, true
FROM module m
JOIN course_bloom_level cb ON cb.course_id = m.course_id AND cb.is_active
WHERE NOT EXISTS (
    SELECT 1 FROM module_bloom_level x
    WHERE x.module_id = m.module_id AND x.is_active
)
ON CONFLICT (module_id, bloom_id) DO UPDATE SET is_active = true;

-- ─── Kontrola výsledku: nic nesmí zůstat bez kategorií ───────
DO $$
DECLARE
    bad_courses int;
    bad_modules int;
BEGIN
    SELECT count(*) INTO bad_courses FROM course c
    WHERE NOT EXISTS (SELECT 1 FROM course_krauu_competence x WHERE x.course_id = c.course_id AND x.is_active)
       OR NOT EXISTS (SELECT 1 FROM course_bloom_level x WHERE x.course_id = c.course_id AND x.is_active);
    SELECT count(*) INTO bad_modules FROM module m
    WHERE NOT EXISTS (SELECT 1 FROM module_neuro_principle x WHERE x.module_id = m.module_id AND x.is_active)
       OR NOT EXISTS (SELECT 1 FROM module_krauu_competence x WHERE x.module_id = m.module_id AND x.is_active)
       OR NOT EXISTS (SELECT 1 FROM module_bloom_level x WHERE x.module_id = m.module_id AND x.is_active);
    IF bad_courses > 0 OR bad_modules > 0 THEN
        RAISE EXCEPTION 'Po migraci zůstalo % kurzů a % modulů bez kategorií', bad_courses, bad_modules;
    END IF;
    RAISE NOTICE '0006 hotovo: všechny kurzy i moduly mají KRAUU, Bloom (a moduly i neurovědní princip).';
END $$;
