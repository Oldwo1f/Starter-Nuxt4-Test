-- Migration: Add status, publishedAt, isPinned to blog_posts
-- Date: 2025-03-10

-- Add status column (draft, active, archived)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active';

-- Add publishedAt column (nullable, when published or scheduled)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP NULL;

-- Add isPinned column (featured articles at top)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing rows: set publishedAt = createdAt where null
UPDATE blog_posts SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

-- Add comments
COMMENT ON COLUMN blog_posts."status" IS 'Post status: draft, active, archived';
COMMENT ON COLUMN blog_posts."publishedAt" IS 'When published or scheduled to publish';
COMMENT ON COLUMN blog_posts."isPinned" IS 'Featured article shown at top of list';
