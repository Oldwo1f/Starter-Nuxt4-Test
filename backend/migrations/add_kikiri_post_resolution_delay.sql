-- Migration: Add postResolutionDelaySeconds to kikiri_config
-- Date: 2026-03-18
-- Description: Délai configurable entre la résolution d'un tirage et le suivant,
-- pour laisser le temps aux animations de distribution des gains côté client.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kikiri_config' AND column_name = 'postResolutionDelaySeconds'
  ) THEN
    ALTER TABLE kikiri_config ADD COLUMN "postResolutionDelaySeconds" INTEGER NOT NULL DEFAULT 18;
  END IF;
END $$;
