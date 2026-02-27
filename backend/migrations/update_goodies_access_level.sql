-- Migration: Update goodies table to use accessLevel instead of isPublic
-- Date: 2026-01-XX
-- Description: Replace boolean isPublic with accessLevel enum ('public', 'member', 'premium', 'vip')

-- Step 1: Check if isPublic column exists and migrate data if it does
DO $$
BEGIN
  -- Check if isPublic column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'goodies' 
    AND column_name = 'isPublic'
  ) THEN
    -- Add new accessLevel column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'goodies' 
      AND column_name = 'accessLevel'
    ) THEN
      ALTER TABLE goodies ADD COLUMN "accessLevel" VARCHAR(20) DEFAULT 'public';
      
      -- Migrate existing data (isPublic = true -> 'public', isPublic = false -> 'member')
      UPDATE goodies SET "accessLevel" = CASE 
        WHEN "isPublic" = true THEN 'public'
        WHEN "isPublic" = false THEN 'member'
        ELSE 'public'
      END;
      
      -- Set NOT NULL constraint after migration
      ALTER TABLE goodies ALTER COLUMN "accessLevel" SET NOT NULL;
      ALTER TABLE goodies ALTER COLUMN "accessLevel" SET DEFAULT 'public';
      
      -- Drop old index on isPublic
      DROP INDEX IF EXISTS "IDX_goodies_isPublic";
      
      -- Drop old isPublic column
      ALTER TABLE goodies DROP COLUMN "isPublic";
    END IF;
  ELSE
    -- isPublic doesn't exist, just add accessLevel if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'goodies' 
      AND column_name = 'accessLevel'
    ) THEN
      ALTER TABLE goodies ADD COLUMN "accessLevel" VARCHAR(20) DEFAULT 'public' NOT NULL;
    END IF;
  END IF;
END $$;

-- Step 2: Add check constraint to ensure valid values (drop first if exists)
ALTER TABLE goodies DROP CONSTRAINT IF EXISTS "CHK_goodies_accessLevel";
ALTER TABLE goodies ADD CONSTRAINT "CHK_goodies_accessLevel" 
  CHECK ("accessLevel" IN ('public', 'member', 'premium', 'vip'));

-- Step 3: Create new index on accessLevel (drop first if exists)
DROP INDEX IF EXISTS "IDX_goodies_accessLevel";
CREATE INDEX "IDX_goodies_accessLevel" ON goodies("accessLevel");

-- Step 4: Add comment to explain the access level
COMMENT ON COLUMN goodies."accessLevel" IS 'Niveau d''accès requis: public (tous), member (membres), premium (membres premium), vip (membres VIP)';
