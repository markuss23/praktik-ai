-- Migration: 0025 - Povinný ukázkový pretest všem modulům, které žádný nemají
-- Samostatný a idempotentní skript (lze pustit opakovaně; doplňuje jen tam, kde aktivní
-- pretest chybí nebo nemá otázky). Spouštět až po 0017 (kontext a formát pretest).
--
-- Kurz z generátoru dostává od zavedení assessment systému ke každému modulu povinný
-- pretest (2 uzavřené + 1 otevřená otázka, agents/course_generator/nodes/save_to_db.py).
-- Starší kurzy ho nemají a backend bere modul bez povinného testu za splněný
-- (course_completion v api/src/assessments/utils.py) — student pak hned po zápisu
-- vidí celý kurz hotový.
--
--   A) moduly bez aktivního pretestu → povinný pretest s ukázkovými otázkami;
--      otevřená otázka se ptá na podstatu modulu, vzorová odpověď je perex (jinak název).
--      Lektor texty upraví v kroku Testy.
--   B) existující pretesty bez otázek (připojené ručně, settings = {}) → stejné ukázkové
--      otázky, jinak je student nespustí a modul nikdy nesplní; pretest je vždy povinný.
--   C) kdo modul splnil ve starém systému (module_task_session passed), tomu se nový
--      pretest z A) uzná jako splněný — dřívější dokončení modulů a kurzů zůstanou.
--
-- Týká se i neaktivních kurzů a modulů, aby byla data jednotná (jako 0006).
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0025_backfill_dummy_pretests.sql

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM assessment_type WHERE code = 'pretest') THEN
        RAISE EXCEPTION 'Chybí formát pretest — nejdřív pusťte 0017';
    END IF;
END $$;

-- Ukázkový obsah ve tvaru PretestSettings (api/src/assessments/pretest/schemas.py)
CREATE FUNCTION pg_temp.dummy_pretest(title text, perex text) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
    SELECT jsonb_build_object(
        'closed', jsonb_build_array(
            jsonb_build_object(
                'question', format('Kde v modulu „%s“ najdete výklad k tématu?', t),
                'options', jsonb_build_array('V záložce Příručka', 'V záložce Test', 'Modul žádný výklad nemá'),
                'correct_index', 0
            ),
            jsonb_build_object(
                'question', 'Co se stane, když pretest splníte?',
                'options', jsonb_build_array('Modul se tím celý dokončí', 'Odemkne se procvičování a test modulu', 'Průběh modulu se vynuluje'),
                'correct_index', 1
            )
        ),
        'open', jsonb_build_object(
            'question', format('Popište vlastními slovy, o čem je modul „%s“.', t),
            'example_answer', COALESCE(NULLIF(btrim(perex), ''), format('Modul se věnuje tématu „%s“.', t)),
            'keywords', jsonb_build_array(t)
        )
    )
    FROM (SELECT COALESCE(NULLIF(btrim(title), ''), 'Modul') AS t) AS x
$$;

-- ─── A) + C) Nové pretesty a uznání splněných modulů ze starého systému ───
WITH created AS (
    INSERT INTO course_assessment (course_id, module_id, assessment_type_code, context, is_enabled, is_required, settings, is_active)
    SELECT m.course_id, m.module_id, 'pretest', 'pretest', true, true, pg_temp.dummy_pretest(m.title, m.perex), true
    FROM module m
    WHERE NOT EXISTS (
        SELECT 1 FROM course_assessment ca
        WHERE ca.module_id = m.module_id AND ca.context = 'pretest' AND ca.is_active
    )
    RETURNING course_assessment_id, module_id
)
INSERT INTO assessment_session (user_id, course_assessment_id, status, state, score, is_passed, finished_at, created_at, updated_at, is_active)
SELECT t.user_id, c.course_assessment_id, 'passed',
       '{"current": 3, "attempts_used": 0, "correct_count": 3, "last_answer": ""}'::jsonb,
       100, true, t.updated_at, t.updated_at, t.updated_at, true
FROM created c
JOIN module_task_session t ON t.module_id = c.module_id AND t.status = 'passed';

-- ─── B) Pretesty bez otázek a nepovinné pretesty ─────────────
UPDATE course_assessment ca
SET settings = pg_temp.dummy_pretest(m.title, m.perex), updated_at = now()
FROM module m
WHERE m.module_id = ca.module_id
  AND ca.context = 'pretest' AND ca.is_active
  AND NOT (ca.settings ? 'closed' AND ca.settings ? 'open');

UPDATE course_assessment
SET is_enabled = true, is_required = true, updated_at = now()
WHERE context = 'pretest' AND is_active AND NOT (is_enabled AND is_required);

-- ─── Kontrola výsledku: každý modul má povinný pretest s otázkami ───
DO $$
DECLARE
    missing int;
BEGIN
    SELECT count(*) INTO missing FROM module m
    WHERE NOT EXISTS (
        SELECT 1 FROM course_assessment ca
        WHERE ca.module_id = m.module_id AND ca.context = 'pretest' AND ca.is_active
          AND ca.is_enabled AND ca.is_required
          AND ca.settings ? 'closed' AND ca.settings ? 'open'
    );
    IF missing > 0 THEN
        RAISE EXCEPTION 'Po migraci zůstalo % modulů bez povinného pretestu s otázkami', missing;
    END IF;
    RAISE NOTICE '0025 hotovo: každý modul má povinný pretest s otázkami.';
END $$;
