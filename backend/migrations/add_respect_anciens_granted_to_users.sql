-- Badge « Respect des anciens » : attribution manuelle par admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'respectAnciensBadgeGranted'
  ) THEN
    ALTER TABLE users ADD COLUMN "respectAnciensBadgeGranted" BOOLEAN NOT NULL DEFAULT false;
    COMMENT ON COLUMN users."respectAnciensBadgeGranted" IS 'Admin : accorde le badge spécial « Respect des anciens » (75+ ans, attribution discrétionnaire)';
  END IF;
END $$;
