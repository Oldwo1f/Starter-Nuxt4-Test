-- Migration: Add videoUrl column to videos table for YouTube support
-- Date: 2025-02-18

-- Add videoUrl column (nullable)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS "videoUrl" VARCHAR NULL;

-- Make videoFile nullable (since we can now have either videoFile or videoUrl)
ALTER TABLE videos ALTER COLUMN "videoFile" DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN videos."videoUrl" IS 'YouTube video URL (optional, takes priority over videoFile if both are present)';
COMMENT ON COLUMN videos."videoFile" IS 'Uploaded video file path (optional, used if videoUrl is not provided)';
