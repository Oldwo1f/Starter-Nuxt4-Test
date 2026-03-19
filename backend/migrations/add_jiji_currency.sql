-- Migration: Add Jiji currency (jetons de jeux)
-- Date: 2026-03-18
-- Description:
-- - Adds users."jijiBalance" (decimal) for game tokens separate from Pūpū
-- - Creates jiji_transactions table for Jiji transaction history
-- - Creates jiji_weekly_credits table to track weekly credits and prevent duplicates

-- Add users."jijiBalance" if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'jijiBalance'
  ) THEN
    ALTER TABLE users ADD COLUMN "jijiBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;
    COMMENT ON COLUMN users."jijiBalance" IS 'Solde en Jiji (jetons de jeux gratuits pour Bingo et Kikiri)';
  END IF;
END $$;

-- Create jiji_transactions table
CREATE TABLE IF NOT EXISTS jiji_transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('debit', 'credit', 'weekly_credit')),
  amount DECIMAL(10,2) NOT NULL,
  "balanceBefore" DECIMAL(10,2) NOT NULL,
  "balanceAfter" DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  "fromUserId" INTEGER NULL REFERENCES users(id),
  "toUserId" INTEGER NULL REFERENCES users(id),
  description TEXT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IDX_jiji_transactions_toUserId" ON jiji_transactions("toUserId");
CREATE INDEX IF NOT EXISTS "IDX_jiji_transactions_fromUserId" ON jiji_transactions("fromUserId");
CREATE INDEX IF NOT EXISTS "IDX_jiji_transactions_createdAt" ON jiji_transactions("createdAt" DESC);

COMMENT ON TABLE jiji_transactions IS 'Historique des transactions Jiji (jetons de jeux)';

-- Create jiji_weekly_credits table for idempotency
CREATE TABLE IF NOT EXISTS jiji_weekly_credits (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  "roleAtCredit" VARCHAR(20) NOT NULL,
  "weekKey" DATE NOT NULL,
  "creditedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "weekKey")
);

CREATE INDEX IF NOT EXISTS "IDX_jiji_weekly_credits_userId" ON jiji_weekly_credits("userId");
CREATE INDEX IF NOT EXISTS "IDX_jiji_weekly_credits_weekKey" ON jiji_weekly_credits("weekKey");
CREATE INDEX IF NOT EXISTS "IDX_jiji_weekly_credits_creditedAt" ON jiji_weekly_credits("creditedAt" DESC);

COMMENT ON TABLE jiji_weekly_credits IS 'Suivi des crédits hebdomadaires Jiji pour éviter les doublons';
