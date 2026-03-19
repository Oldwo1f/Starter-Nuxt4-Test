-- Migration: Add bettingDurationSeconds to kikiri_config
-- Date: 2026-03-16
-- Description: Allows configuring the duration of each draw's betting phase in seconds

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kikiri_config' AND column_name = 'bettingDurationSeconds'
  ) THEN
    ALTER TABLE kikiri_config ADD COLUMN "bettingDurationSeconds" INTEGER NOT NULL DEFAULT 300;
  END IF;
END $$;
