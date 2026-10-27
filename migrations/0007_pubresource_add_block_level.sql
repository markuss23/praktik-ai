-- Migration: 0007 - Public resource Blok a Level
-- Description: Nepovinné sloupce pub_resource.block_id (→ course_block) a pub_resource.level_id (→ course_level).
-- Requires existing tables: pub_resource, course_block, course_level (migrace 0005)

ALTER TABLE pub_resource ADD COLUMN IF NOT EXISTS block_id BIGINT;
ALTER TABLE pub_resource ADD COLUMN IF NOT EXISTS level_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pub_resource_block_id_fkey') THEN
        ALTER TABLE pub_resource ADD CONSTRAINT pub_resource_block_id_fkey
            FOREIGN KEY (block_id) REFERENCES course_block (block_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pub_resource_level_id_fkey') THEN
        ALTER TABLE pub_resource ADD CONSTRAINT pub_resource_level_id_fkey
            FOREIGN KEY (level_id) REFERENCES course_level (level_id);
    END IF;
    RAISE NOTICE '0007 hotovo: Bloky a Levely přidány do tabulky pub_resource.';
END $$;
