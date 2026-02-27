-- Migration: Add referralCode column to users table
-- Date: 2026-01-XX
-- Description: Add referralCode column to allow users to have unique referral codes

-- Add referralCode column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'referralCode'
  ) THEN
    ALTER TABLE users ADD COLUMN "referralCode" VARCHAR NULL;
    COMMENT ON COLUMN users."referralCode" IS 'Code de parrainage unique pour l''utilisateur';
    
    -- Create unique index on referralCode (only for non-null values)
    CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_referralCode" 
      ON users("referralCode") 
      WHERE "referralCode" IS NOT NULL;
  END IF;
END $$;
