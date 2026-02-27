-- Migration: Add accessLevel column to courses table
-- Date: 2026-01-XX
-- Description: Add accessLevel enum ('public', 'member', 'premium', 'vip') to courses table

-- Step 1: Add new accessLevel column
ALTER TABLE courses ADD COLUMN IF NOT EXISTS "accessLevel" VARCHAR(20) DEFAULT 'public';

-- Step 2: Set NOT NULL constraint
ALTER TABLE courses ALTER COLUMN "accessLevel" SET NOT NULL;
ALTER TABLE courses ALTER COLUMN "accessLevel" SET DEFAULT 'public';

-- Step 3: Add check constraint to ensure valid values
ALTER TABLE courses DROP CONSTRAINT IF EXISTS "CHK_courses_accessLevel";
ALTER TABLE courses ADD CONSTRAINT "CHK_courses_accessLevel" 
  CHECK ("accessLevel" IN ('public', 'member', 'premium', 'vip'));

-- Step 4: Create index on accessLevel
CREATE INDEX IF NOT EXISTS "IDX_courses_accessLevel" ON courses("accessLevel");

-- Add comment to explain the access level
COMMENT ON COLUMN courses."accessLevel" IS 'Niveau d''accès requis: public (tous), member (membres), premium (membres premium), vip (membres VIP)';
