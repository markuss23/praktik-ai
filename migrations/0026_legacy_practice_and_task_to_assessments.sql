-- Migration: 0026 - Převod dat ze starého systému (deprecated endpointy) do assessments
-- Samostatný a idempotentní skript (lze pustit opakovaně). Spouštět až po 0025.
--
-- Starý systém:
--   practice_question + practice_option + question_keyword — otázky modulu z generátoru
--     kurzu (vždy 2 uzavřené + 1 otevřená), dnes je to pretest
--   module_task_session + task_attempt — závěrečný AI úkol modulu
--     (pravidla v module.max_task_attempts a module.passing_score)
--
--   A) ukázkový pretest z 0025 → skutečné otázky z practice_question
--      (2 první validní uzavřené + 1. otevřená). Pretest upravený lektorem se nemění.
--   B) každý modul → povinný open_question_ai v kontextu assessment
--      (max_attempts a pass_threshold z modulu)
--   C) module_task_session → assessment_session na B), pokusy → assessment_turn.
--      in_progress se převede jako abandoned (rozpracovaný běh nejde navázat).
--      Řádky „Practice test score: …“ z complete_module nejsou AI úkol — přeskočí se
--      (0025 C z nich uzná jen pretest; povinný AI úkol si student udělá znovu).
--   D) každý modul → nepovinné procvičování open_question_ai + closed_questions_ai
--      (výchozí nastavení formátu)
--
-- Nepřevádí se: user_practice_question / user_practice_attempt (personalizované
-- procvičování nemá v assessments obdobu). Staré tabulky zůstávají beze změny.
--
-- Spuštění lokálně:
--   docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' < migrations/0026_legacy_practice_and_task_to_assessments.sql

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM assessment_type WHERE code = 'pretest')
       OR NOT EXISTS (SELECT 1 FROM assessment_type WHERE code = 'open_question_ai')
       OR NOT EXISTS (SELECT 1 FROM assessment_type WHERE code = 'closed_questions_ai') THEN
        RAISE EXCEPTION 'Chybí formát pretest, open_question_ai nebo closed_questions_ai — nejdřív pusťte 0014, 0016 a 0017';
    END IF;
    IF EXISTS (
        SELECT 1 FROM module m WHERE NOT EXISTS (
            SELECT 1 FROM course_assessment ca
            WHERE ca.module_id = m.module_id AND ca.context = 'pretest' AND ca.is_active
        )
    ) THEN
        RAISE EXCEPTION 'Některý modul nemá pretest — nejdřív pusťte 0025';
    END IF;
END $$;

-- ─── A) Ukázkový pretest → otázky z practice_question ───────
-- Tvar PretestSettings (api/src/assessments/pretest/schemas.py)
WITH closed_opts AS (
    SELECT q.question_id, q.module_id, q.question, q.correct_answer,
           -- deterministické zamíchání — LLM dával správnou odpověď na stejnou pozici
           jsonb_agg(o.text ORDER BY md5(o.option_id::text)) AS options,
           count(*) AS n,
           count(DISTINCT btrim(o.text)) AS n_distinct
    FROM practice_question q
    JOIN practice_option o ON o.question_id = q.question_id AND o.is_active
    WHERE q.is_active AND q.question_type = 'closed' AND btrim(q.question) <> ''
    GROUP BY q.question_id
),
closed_valid AS (
    SELECT module_id,
           jsonb_build_object(
               'question', question,
               'options', options,
               'correct_index', (
                   SELECT e.ord - 1 FROM jsonb_array_elements_text(options) WITH ORDINALITY e(t, ord)
                   WHERE btrim(e.t) = btrim(correct_answer) ORDER BY e.ord LIMIT 1
               )
           ) AS item,
           row_number() OVER (PARTITION BY module_id ORDER BY question_id) AS rn
    FROM closed_opts
    WHERE n BETWEEN 2 AND 6 AND n = n_distinct
      AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(options) t
          WHERE btrim(t) = btrim(correct_answer)
      )
),
open_q AS (
    SELECT DISTINCT ON (q.module_id) q.module_id,
           jsonb_build_object(
               'question', q.question,
               'example_answer', COALESCE(
                   NULLIF(btrim(q.example_answer), ''),
                   NULLIF(btrim(m.perex), ''),
                   format('Modul se věnuje tématu „%s“.', m.title)
               ),
               'keywords', COALESCE(
                   (SELECT jsonb_agg(DISTINCT btrim(k.keyword)) FROM question_keyword k
                    WHERE k.question_id = q.question_id AND k.is_active AND btrim(k.keyword) <> ''),
                   jsonb_build_array(COALESCE(NULLIF(btrim(m.title), ''), 'Modul'))
               )
           ) AS item
    FROM practice_question q
    JOIN module m ON m.module_id = q.module_id
    WHERE q.is_active AND q.question_type = 'open' AND btrim(q.question) <> ''
    ORDER BY q.module_id, q.question_id
),
legacy AS (
    SELECT c1.module_id,
           jsonb_build_object('closed', jsonb_build_array(c1.item, c2.item), 'open', o.item) AS settings
    FROM closed_valid c1
    JOIN closed_valid c2 ON c2.module_id = c1.module_id AND c2.rn = 2
    JOIN open_q o ON o.module_id = c1.module_id
    WHERE c1.rn = 1
)
UPDATE course_assessment ca
SET settings = l.settings, updated_at = now()
FROM legacy l
WHERE ca.module_id = l.module_id
  AND ca.context = 'pretest' AND ca.is_active
  -- jen ukázkový obsah z 0025 (pg_temp.dummy_pretest)
  AND ca.settings #>> '{closed,0,question}' LIKE 'Kde v modulu „%“ najdete výklad k tématu?'
  AND ca.settings #>> '{closed,1,question}' = 'Co se stane, když pretest splníte?';

-- ─── B) Starý AI úkol → open_question_ai (assessment, povinný) ───
INSERT INTO course_assessment (course_id, module_id, assessment_type_code, context, is_enabled, is_required, settings, is_active)
SELECT m.course_id, m.module_id, 'open_question_ai', 'assessment', true, true,
       jsonb_build_object(
           'max_attempts', GREATEST(m.max_task_attempts, 1),
           'pass_threshold', (LEAST(GREATEST(m.passing_score, 0), 100) / 100.0)::float8
       ),
       true
FROM module m
WHERE NOT EXISTS (
    SELECT 1 FROM course_assessment ca
    WHERE ca.module_id = m.module_id AND ca.context = 'assessment'
      AND ca.assessment_type_code = 'open_question_ai' AND ca.is_active
);

-- ─── D) Procvičování → open_question_ai + closed_questions_ai (practice, nepovinné) ───
-- settings = default_settings formátu (0014, 0016)
INSERT INTO course_assessment (course_id, module_id, assessment_type_code, context, is_enabled, is_required, settings, is_active)
SELECT m.course_id, m.module_id, t.code, 'practice', true, false, t.default_settings, true
FROM module m
CROSS JOIN assessment_type t
WHERE t.code IN ('open_question_ai', 'closed_questions_ai')
  AND NOT EXISTS (
      SELECT 1 FROM course_assessment ca
      WHERE ca.module_id = m.module_id AND ca.context = 'practice'
        AND ca.assessment_type_code = t.code AND ca.is_active
  );

-- ─── C) Historie AI úkolů → assessment_session + assessment_turn ───
-- state = OpenQuestionAIState; legacy_session_id hlídá opakované spuštění
WITH attempts AS (
    SELECT a.session_id,
           count(*) AS used,
           (array_agg(a.ai_score ORDER BY a.created_at DESC, a.attempt_id DESC))[1] AS last_score,
           (array_agg(a.user_response ORDER BY a.created_at DESC, a.attempt_id DESC))[1] AS last_answer
    FROM task_attempt a
    WHERE a.status = 'evaluated' AND a.is_active
    GROUP BY a.session_id
),
created AS (
    INSERT INTO assessment_session (user_id, course_assessment_id, status, state, score, is_passed, finished_at, created_at, updated_at, is_active)
    SELECT t.user_id, ca.course_assessment_id,
           (CASE t.status WHEN 'passed' THEN 'passed' WHEN 'failed' THEN 'failed' ELSE 'abandoned' END)::assessment_session_status,
           jsonb_build_object(
               'question', t.generated_task,
               'attempts_used', COALESCE(a.used, 0),
               'last_answer', COALESCE(a.last_answer, ''),
               'legacy_session_id', t.session_id
           ),
           CASE WHEN t.status <> 'in_progress' THEN a.last_score END,
           CASE WHEN t.status <> 'in_progress' THEN t.status = 'passed' END,
           t.updated_at, t.created_at, t.updated_at, t.is_active
    FROM module_task_session t
    JOIN course_assessment ca
      ON ca.module_id = t.module_id AND ca.context = 'assessment'
     AND ca.assessment_type_code = 'open_question_ai' AND ca.is_active
    LEFT JOIN attempts a ON a.session_id = t.session_id
    WHERE t.generated_task NOT LIKE 'Practice test score:%'
      AND NOT EXISTS (
          SELECT 1 FROM assessment_session s
          WHERE s.state ->> 'legacy_session_id' = t.session_id::text
      )
    RETURNING session_id, (state ->> 'legacy_session_id')::bigint AS legacy_id
)
INSERT INTO assessment_turn (session_id, role, content, payload, created_at, updated_at)
SELECT c.session_id, r.role::assessment_turn_role, r.content, r.payload, a.created_at, a.updated_at
FROM created c
JOIN task_attempt a ON a.session_id = c.legacy_id AND a.status = 'evaluated' AND a.is_active
CROSS JOIN LATERAL (VALUES
    (1, 'student', a.user_response, NULL::jsonb),
    (2, 'assistant', a.ai_feedback, jsonb_build_object('score', a.ai_score, 'is_passed', a.is_passed))
) AS r(ord, role, content, payload)
ORDER BY c.session_id, a.created_at, a.attempt_id, r.ord;

-- ─── Kontrola výsledku ───────────────────────────────────────
DO $$
DECLARE
    dummy int;
    missing int;
BEGIN
    SELECT count(*) INTO missing FROM module m
    WHERE NOT EXISTS (
        SELECT 1 FROM course_assessment ca
        WHERE ca.module_id = m.module_id AND ca.context = 'assessment'
          AND ca.assessment_type_code = 'open_question_ai' AND ca.is_active
    );
    IF missing > 0 THEN
        RAISE EXCEPTION 'Po migraci zůstalo % modulů bez open_question_ai', missing;
    END IF;

    SELECT count(*) INTO missing FROM module m
    WHERE (SELECT count(*) FROM course_assessment ca
           WHERE ca.module_id = m.module_id AND ca.context = 'practice' AND ca.is_active
             AND ca.assessment_type_code IN ('open_question_ai', 'closed_questions_ai')) < 2;
    IF missing > 0 THEN
        RAISE EXCEPTION 'Po migraci zůstalo % modulů bez procvičování', missing;
    END IF;

    SELECT count(*) INTO dummy FROM course_assessment
    WHERE context = 'pretest' AND is_active
      AND settings #>> '{closed,0,question}' LIKE 'Kde v modulu „%“ najdete výklad k tématu?'
      AND settings #>> '{closed,1,question}' = 'Co se stane, když pretest splníte?';
    RAISE NOTICE '0026 hotovo: % pretestů zůstává ukázkových (modul nemá použitelné practice_question).', dummy;
END $$;
