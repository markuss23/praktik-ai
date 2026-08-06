-- Migration: 003 - Universal ticket system
-- Description: Replaces module_ticket with generic ticket / ticket_message,
--   migrates existing data, keeps module_ticket around (renamed) for rollback.
-- Requires existing tables: "user", course, module_ticket

-- ─── EXTEND EXISTING ENUM ─────────────────────────────────────

ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'closed';

-- ─── CREATE NEW ENUM TYPE ─────────────────────────────────────

DO $$ BEGIN CREATE TYPE ticket_entity_type AS ENUM ('module'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TICKET TABLES ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket (
  ticket_id BIGSERIAL PRIMARY KEY,
  requester_id BIGINT NOT NULL REFERENCES "user"(user_id),
  assignee_id BIGINT REFERENCES "user"(user_id),
  entity_type ticket_entity_type,
  entity_id BIGINT,
  course_id BIGINT REFERENCES course(course_id),
  category ticket_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

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
-- ticket_id se přebírá 1:1 ze starého module_ticket.ticket_id, aby šlo
-- napojit reason/reply zprávy níže bez mezitabulky.

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

SELECT setval(
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
-- author_id = course.owner_id: module_ticket neukládal, kdo přesně odpověděl
-- (odpovědět mohl i garant/superadmin), takže jde jen o nejlepší dostupný odhad.

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

SELECT setval(
  pg_get_serial_sequence('ticket_message', 'message_id'),
  COALESCE((SELECT MAX(message_id) FROM ticket_message), 1)
);

-- ─── KEEP OLD TABLE FOR ROLLBACK ──────────────────────────────
-- Data se nemažou, jen se tabulka odloží mimo cestu. Po ověření, že appka
-- s novým ticket systémem funguje, ji lze bezpečně dropnout ručně:
--   DROP TABLE module_ticket_deprecated;

ALTER TABLE IF EXISTS module_ticket RENAME TO module_ticket_deprecated;
