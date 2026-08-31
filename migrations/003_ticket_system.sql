-- Migration: 003 - Universal ticket system
-- Description: Replaces module_ticket with generic ticket / ticket_message,
--   migrates existing data, keeps module_ticket around (renamed) for rollback.
-- Requires existing tables: "user", course, module_ticket

-- ─── AVOID INDEX NAME COLLISION ───────────────────────────────
-- Nová tabulka `ticket` má index se stejným jménem jako starý module_ticket
-- (ix_ticket_course_id). Jméno indexu je v Postgresu unikátní per schéma, ne
-- per tabulka, takže starý index musí ustoupit dřív, než níže vytvoříme nový.
-- Přejmenování je čistě kosmetické — nic v appce indexy podle jména nevolá.

ALTER INDEX IF EXISTS ix_ticket_course_id RENAME TO ix_module_ticket_course_id_old;

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

-- ─── TICKET TABLES ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket (
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

-- Pro případ, že tabulka vznikla dřívějším během tohoto skriptu ještě bez NOT NULL.
-- Bezpečné jen pokud žádný řádek nemá entity_type NULL (u fresh installu není žádný řádek).
ALTER TABLE ticket ALTER COLUMN entity_type SET NOT NULL;

CREATE TABLE IF NOT EXISTS ticket_message (
  message_id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES ticket(ticket_id),
  author_id BIGINT NOT NULL REFERENCES "user"(user_id),
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- ─── CREATE INDEXES ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ticket_requester_id ON ticket(requester_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignee_id ON ticket(assignee_id);
CREATE INDEX IF NOT EXISTS idx_ticket_entity ON ticket(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ticket_course_id ON ticket(course_id);
CREATE INDEX IF NOT EXISTS idx_ticket_message_ticket_id ON ticket_message(ticket_id);

-- Jeden otevřený ticket na requestera, entitu a kategorii
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_requester_entity_category
  ON ticket(requester_id, entity_type, entity_id, category)
  WHERE status = 'open';

-- Unikátní title na entitu+kategorii mezi aktivními tickety
CREATE UNIQUE INDEX IF NOT EXISTS uq_title_category_entity_active
  ON ticket(title, category, entity_type, entity_id)
  WHERE is_active;

-- ─── DATA MIGRATION: module_ticket -> ticket ──────────────────
-- Celá sekce se přeskočí, pokud module_ticket neexistuje (čerstvá instalace
-- bez starých dat) — PL/pgSQL naplánuje SQL uvnitř IF až ve chvíli, kdy se
-- k němu skutečně dostane, takže na chybějící tabulku nesáhne.
-- ticket_id se přebírá 1:1 ze starého module_ticket.ticket_id, aby šlo
-- napojit reason/reply zprávy níže bez mezitabulky.

DO $$
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

    PERFORM setval(
      pg_get_serial_sequence('ticket_message', 'message_id'),
      COALESCE((SELECT MAX(message_id) FROM ticket_message), 1)
    );

    -- Data se nemažou, tabulka se jen odloží mimo cestu. Po ověření, že
    -- appka s novým ticket systémem funguje, ji lze bezpečně dropnout ručně:
    --   DROP TABLE module_ticket_deprecated;
    ALTER TABLE module_ticket RENAME TO module_ticket_deprecated;

  END IF;
END $$;
