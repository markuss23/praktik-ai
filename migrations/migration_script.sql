-- Migration: 002 - Public database schema
-- Description: Creates only public resource tables 
-- Requires existing tables: "user", course_subject, course_target

-- ─── CREATE ENUM TYPES ────────────────────────────────────────

DO $$ BEGIN CREATE TYPE edu_level AS ENUM ('primary', 'secondary', 'higher'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE difficulty_level AS ENUM ('complete_beginner', 'beginner', 'slightly_advanced', 'intermediate', 'advanced', 'expert'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pub_resource_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE attach_type AS ENUM ('pdf', 'docx', 'pptx', 'image', 'video', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE review_verdict AS ENUM ('approved', 'rejected', 'needs_revision'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── PUBLIC RESOURCES TABLES ──────────────────────────────────

CREATE TABLE IF NOT EXISTS pub_resource (
  resource_id BIGSERIAL PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES "user"(user_id),
  subject_id BIGINT REFERENCES course_subject(subject_id),
  target_id BIGINT REFERENCES course_target(target_id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  education_level edu_level,
  difficulty_level difficulty_level,
  status pub_resource_status,
  allow_forks BOOLEAN DEFAULT false,
  is_public BOOLEAN,
  is_fork BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS pub_resource_fork (
  fork_id BIGSERIAL PRIMARY KEY,
  original_id BIGINT NOT NULL REFERENCES pub_resource(resource_id),
  forked_id BIGINT NOT NULL REFERENCES pub_resource(resource_id),
  author_id BIGINT NOT NULL REFERENCES "user"(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS pub_resource_file (
  file_id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES pub_resource(resource_id),
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type attach_type,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS pub_resource_rating (
  rating_id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES pub_resource(resource_id),
  user_id BIGINT NOT NULL REFERENCES "user"(user_id),
  score INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(resource_id, user_id)
);

CREATE TABLE IF NOT EXISTS pub_resource_review (
  review_id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES pub_resource(resource_id),
  reviewer_id BIGINT NOT NULL REFERENCES "user"(user_id),
  verdict review_verdict,
  notes TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- ─── PUBLIC COLLECTIONS TABLES ────────────────────────────────

CREATE TABLE IF NOT EXISTS pub_collection (
  collection_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES "user"(user_id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS pub_collection_resource (
  id BIGSERIAL PRIMARY KEY,
  collection_id BIGINT NOT NULL REFERENCES pub_collection(collection_id),
  resource_id BIGINT NOT NULL REFERENCES pub_resource(resource_id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- ─── CREATE INDEXES ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pub_resource_author_id ON pub_resource(author_id);
CREATE INDEX IF NOT EXISTS idx_pub_resource_status ON pub_resource(status);
CREATE INDEX IF NOT EXISTS idx_pub_resource_rating_resource_id ON pub_resource_rating(resource_id);
CREATE INDEX IF NOT EXISTS idx_pub_collection_user_id ON pub_collection(user_id);
