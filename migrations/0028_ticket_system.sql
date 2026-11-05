-- Migration: 003 - Universal ticket system
-- Description: Replaces module_ticket with generic ticket / ticket_message,
--   migrates existing data, keeps module_ticket around (renamed) for rollback.
-- Requires existing tables: "user", course, module_ticket
--
-- Skript je idempotentní — jde pustit opakovaně, každý krok vypíše přes
-- RAISE NOTICE, co udělal (nebo proč to přeskočil).
-- Nespouštět v jedné transakci (psql -1 / --single-transaction): nové hodnoty
-- enumu přidané přes ALTER TYPE ... ADD VALUE se v Postgresu nesmí použít ve
-- stejné transakci, ve které vznikly (index níže používá 'in_progress').

-- ─── AVOID INDEX NAME COLLISION ───────────────────────────────
-- Nová tabulka `ticket` má index se stejným jménem jako starý module_ticket
-- (ix_ticket_course_id). Jméno indexu je v Postgresu unikátní per schéma, ne
-- per tabulka, takže starý index musí ustoupit dřív, než níže vytvoříme nový.
-- Přejmenuje se jen index patřící module_ticket — při opakovaném běhu už může
-- ix_ticket_course_id patřit nové tabulce ticket a ten se měnit nesmí.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class idx ON idx.oid = i.indexrelid
    JOIN pg_class tbl ON tbl.oid = i.indrelid
    WHERE idx.relname = 'ix_ticket_course_id' AND tbl.relname = 'module_ticket'
  ) THEN
    ALTER INDEX ix_ticket_course_id RENAME TO ix_module_ticket_course_id_old;
    RAISE NOTICE '[003] Index ix_ticket_course_id (module_ticket) přejmenován na ix_module_ticket_course_id_old';
  ELSE
    RAISE NOTICE '[003] Index ix_ticket_course_id na module_ticket neexistuje — přejmenování přeskočeno';
  END IF;
END $$;

-- ─── EXTEND EXISTING ENUM ─────────────────────────────────────

ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'in_progress';

-- category pro generické tickety bez vazby na entitu (bug/dotaz)
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'bug';
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'question';
-- category pro entity_type=course a entity_type=pub_resource
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'course_feedback';
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'content_issue';

-- ─── CREATE NEW ENUM TYPE ─────────────────────────────────────
-- 'general' = obecný ticket bez vazby na entitu (bug/dotaz), entity_id pak null.

DO $$ BEGIN CREATE TYPE ticket_entity_type AS ENUM ('module', 'general'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE ticket_entity_type ADD VALUE IF NOT EXISTS 'general';
ALTER TYPE ticket_entity_type ADD VALUE IF NOT EXISTS 'course';
ALTER TYPE ticket_entity_type ADD VALUE IF NOT EXISTS 'pub_resource';

DO $$
BEGIN
  RAISE NOTICE '[003] Enum ticket_status = %', enum_range(NULL::ticket_status);
  RAISE NOTICE '[003] Enum ticket_type = %', enum_range(NULL::ticket_type);
  RAISE NOTICE '[003] Enum ticket_entity_type = %', enum_range(NULL::ticket_entity_type);
END $$;

-- ─── TICKET TABLES ────────────────────────────────────────────

DO $$
BEGIN
  IF to_regclass('ticket') IS NULL THEN
    CREATE TABLE ticket (
      ticket_id BIGSERIAL PRIMARY KEY,
      requester_id BIGINT NOT NULL REFERENCES "user"(user_id),
      assignee_id BIGINT REFERENCES "user"(user_id),
      entity_type ticket_entity_type NOT NULL,
      entity_id BIGINT,
      course_id BIGINT REFERENCES course(course_id),
      category ticket_type NOT NULL,
      title VARCHAR(255) NOT NULL,
      status ticket_status NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true
    );
    RAISE NOTICE '[003] Tabulka ticket vytvořena';
  ELSE
    RAISE NOTICE '[003] Tabulka ticket už existuje — přeskočeno';
  END IF;
END $$;

-- Pro případ, že tabulka vznikla dřívějším během tohoto skriptu ještě bez NOT NULL.
-- Bezpečné jen pokud žádný řádek nemá entity_type NULL (u fresh installu není žádný řádek).
ALTER TABLE ticket ALTER COLUMN entity_type SET NOT NULL;

DO $$
BEGIN
  IF to_regclass('ticket_message') IS NULL THEN
    CREATE TABLE ticket_message (
      message_id BIGSERIAL PRIMARY KEY,
      ticket_id BIGINT NOT NULL REFERENCES ticket(ticket_id),
      author_id BIGINT NOT NULL REFERENCES "user"(user_id),
      body TEXT NOT NULL,
      is_internal BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true
    );
    RAISE NOTICE '[003] Tabulka ticket_message vytvořena';
  ELSE
    RAISE NOTICE '[003] Tabulka ticket_message už existuje — přeskočeno';
  END IF;
END $$;

-- ─── CREATE INDEXES ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ticket_requester_id ON ticket(requester_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignee_id ON ticket(assignee_id);
CREATE INDEX IF NOT EXISTS idx_ticket_entity ON ticket(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ticket_course_id ON ticket(course_id);
CREATE INDEX IF NOT EXISTS idx_ticket_message_ticket_id ON ticket_message(ticket_id);

DO $$
BEGIN
  RAISE NOTICE '[003] Běžné indexy ticket / ticket_message zajištěny';
END $$;

-- Title ticketu nesmí být unikátní (dva studenti mohou mít stejný titulek) —
-- dřívější verze tohoto skriptu tenhle index vytvářela, proto se maže.
DO $$
BEGIN
  IF to_regclass('uq_title_category_entity_active') IS NOT NULL THEN
    DROP INDEX uq_title_category_entity_active;
    RAISE NOTICE '[003] Index uq_title_category_entity_active (unikátní title) smazán';
  ELSE
    RAISE NOTICE '[003] Index uq_title_category_entity_active neexistuje — přeskočeno';
  END IF;
END $$;

-- ─── DATA MIGRATION: module_ticket -> ticket ──────────────────
-- Celá sekce se přeskočí, pokud module_ticket neexistuje (čerstvá instalace
-- bez starých dat) — PL/pgSQL naplánuje SQL uvnitř IF až ve chvíli, kdy se
-- k němu skutečně dostane, takže na chybějící tabulku nesáhne.
-- ticket_id se přebírá 1:1 ze starého module_ticket.ticket_id, aby šlo
-- napojit reason/reply zprávy níže bez mezitabulky.

DO $$
DECLARE
  n_rows bigint;
BEGIN
  IF to_regclass('module_ticket') IS NOT NULL THEN

    INSERT INTO ticket (
      ticket_id, requester_id, entity_type, entity_id,
      course_id, category, title, status,
      created_at, updated_at, is_active
    )
    SELECT
      ticket_id, user_id, 'module', module_id,
      course_id, ticket_type, title, status,
      created_at, updated_at, is_active
    FROM module_ticket
    ON CONFLICT (ticket_id) DO NOTHING;
    GET DIAGNOSTICS n_rows = ROW_COUNT;
    RAISE NOTICE '[003] module_ticket -> ticket: převedeno % ticketů', n_rows;

    PERFORM setval(
      pg_get_serial_sequence('ticket', 'ticket_id'),
      COALESCE((SELECT MAX(ticket_id) FROM ticket), 1)
    );

    -- module_ticket.reason -> úvodní zpráva vlákna (autor = requester)
    INSERT INTO ticket_message (
      ticket_id, author_id, body, is_internal,
      created_at, updated_at, is_active
    )
    SELECT
      ticket_id, user_id, reason, false,
      created_at, created_at, is_active
    FROM module_ticket;
    GET DIAGNOSTICS n_rows = ROW_COUNT;
    RAISE NOTICE '[003] module_ticket.reason -> ticket_message: vloženo % zpráv', n_rows;

    -- module_ticket.reply -> odpověď ve vlákně.
    -- author_id = course.owner_id: module_ticket neukládal, kdo přesně
    -- odpověděl (odpovědět mohl i garant/superadmin), je to jen odhad.
    INSERT INTO ticket_message (
      ticket_id, author_id, body, is_internal,
      created_at, updated_at, is_active
    )
    SELECT
      mt.ticket_id, c.owner_id, mt.reply, false,
      mt.updated_at, mt.updated_at, mt.is_active
    FROM module_ticket mt
    JOIN course c ON c.course_id = mt.course_id
    WHERE mt.reply IS NOT NULL;
    GET DIAGNOSTICS n_rows = ROW_COUNT;
    RAISE NOTICE '[003] module_ticket.reply -> ticket_message: vloženo % odpovědí', n_rows;

    PERFORM setval(
      pg_get_serial_sequence('ticket_message', 'message_id'),
      COALESCE((SELECT MAX(message_id) FROM ticket_message), 1)
    );

    -- Data se nemažou, tabulka se jen odloží mimo cestu. Po ověření, že
    -- appka s novým ticket systémem funguje, ji lze bezpečně dropnout ručně:
    --   DROP TABLE module_ticket_deprecated;
    ALTER TABLE module_ticket RENAME TO module_ticket_deprecated;
    RAISE NOTICE '[003] Tabulka module_ticket přejmenována na module_ticket_deprecated';

  ELSE
    RAISE NOTICE '[003] Tabulka module_ticket neexistuje — převod dat přeskočen';
  END IF;
END $$;

-- ─── UNIQUE INDEX: jeden nevyřešený ticket ────────────────────
-- Jeden aktivní nevyřešený ticket na requestera, entitu a kategorii. Smazaný
-- (is_active=false) ani vyřešený ticket založení nového neblokuje.
-- Vytváří se až po převodu dat; pokud stará data pravidlo porušují, skript
-- vypíše počet kolizí a skončí chybou místo nesrozumitelné hlášky z indexu.

DO $$
DECLARE
  n_conflicts bigint;
BEGIN
  SELECT COUNT(*) INTO n_conflicts
  FROM (
    SELECT 1
    FROM ticket
    WHERE is_active AND status IN ('open', 'in_progress', 'pending')
      AND entity_id IS NOT NULL
    GROUP BY requester_id, entity_type, entity_id, category
    HAVING COUNT(*) > 1
  ) dup;

  IF n_conflicts > 0 THEN
    RAISE EXCEPTION '[003] Nelze vytvořit uq_ticket_requester_entity_category: % kombinací (requester, entita, kategorie) má víc nevyřešených ticketů — nejdřív je vyřeš/smaž', n_conflicts;
  END IF;

  DROP INDEX IF EXISTS uq_ticket_requester_entity_category;
  CREATE UNIQUE INDEX uq_ticket_requester_entity_category
    ON ticket(requester_id, entity_type, entity_id, category)
    WHERE is_active AND status IN ('open', 'in_progress', 'pending');
  RAISE NOTICE '[003] Index uq_ticket_requester_entity_category (re)vytvořen pro stavy open/in_progress/pending a is_active';
END $$;

DO $$
BEGIN
  RAISE NOTICE '[003] Hotovo: ticket = % řádků, ticket_message = % řádků',
    (SELECT COUNT(*) FROM ticket), (SELECT COUNT(*) FROM ticket_message);
END $$;
