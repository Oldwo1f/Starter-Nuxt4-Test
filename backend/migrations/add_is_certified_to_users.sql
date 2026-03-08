-- Migration: Add isCertified to users
-- Date: 2026-01-XX
-- Description:
-- - Adds users."isCertified" (boolean) to support certified badge for members
-- - Default value is false

-- Add users."isCertified" if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'isCertified'
  ) THEN
    ALTER TABLE users ADD COLUMN "isCertified" BOOLEAN NOT NULL DEFAULT FALSE;
    COMMENT ON COLUMN users."isCertified" IS
      'Badge certifié attribué par un administrateur. Affiche un badge à côté de l''avatar dans le marketplace et les annonces.';
  END IF;
END $$;
