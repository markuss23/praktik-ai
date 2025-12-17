-- Migration: Add is_published column to module table
-- Date: 2025-12-17

ALTER TABLE module
ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: Update existing modules to be published
-- UPDATE module SET is_published = TRUE WHERE is_active = TRUE;
