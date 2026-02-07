-- Migration: Update goodies table to use single square image instead of two banners
-- Date: 2026-02-05

-- Add new imageUrl column
ALTER TABLE goodies ADD COLUMN IF NOT EXISTS imageUrl VARCHAR NULL;

-- Note: We don't migrate existing banner data automatically
-- Admin will need to re-upload images using the new square format

-- Remove old banner columns (commented out for safety - uncomment after verifying)
-- ALTER TABLE goodies DROP COLUMN IF EXISTS bannerHorizontalUrl;
-- ALTER TABLE goodies DROP COLUMN IF EXISTS bannerVerticalUrl;
