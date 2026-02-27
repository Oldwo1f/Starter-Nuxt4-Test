-- Migration: Add paidAccessExpiresAt to users and create bank_transfer_payments table
-- Date: 2026-02-27
-- Description:
-- - Adds users."paidAccessExpiresAt" (timestamp) to support 1-year bank transfer access
-- - Creates bank_transfer_payments table to store pending/paid intents and webhook reconciliation

-- 1) Add users."paidAccessExpiresAt" if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'paidAccessExpiresAt'
  ) THEN
    ALTER TABLE users ADD COLUMN "paidAccessExpiresAt" TIMESTAMP NULL;
    COMMENT ON COLUMN users."paidAccessExpiresAt" IS
      'Date d''expiration des droits payants (virement). Si passée, le rôle effectif retombe à user.';
  END IF;
END $$;

-- 2) Create bank_transfer_payments table (idempotent)
CREATE TABLE IF NOT EXISTS bank_transfer_payments (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "pack" VARCHAR(20) NOT NULL,
  "amountXpf" INTEGER NOT NULL,
  "referenceId" VARCHAR(64) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "bankTransactionId" VARCHAR(128) NULL,
  "payerName" VARCHAR(255) NULL,
  "paidAt" TIMESTAMP NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3) Constraints & indexes (idempotent)
-- referenceId uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'bank_transfer_payments'
      AND indexname = 'IDX_bank_transfer_payments_referenceId'
  ) THEN
    CREATE UNIQUE INDEX "IDX_bank_transfer_payments_referenceId"
      ON bank_transfer_payments("referenceId");
  END IF;
END $$;

-- userId index (to fetch latest per user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'bank_transfer_payments'
      AND indexname = 'IDX_bank_transfer_payments_userId_createdAt'
  ) THEN
    CREATE INDEX "IDX_bank_transfer_payments_userId_createdAt"
      ON bank_transfer_payments("userId", "createdAt" DESC);
  END IF;
END $$;

-- status index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'bank_transfer_payments'
      AND indexname = 'IDX_bank_transfer_payments_status'
  ) THEN
    CREATE INDEX "IDX_bank_transfer_payments_status"
      ON bank_transfer_payments("status");
  END IF;
END $$;

-- basic check constraints (drop+recreate to be safe)
ALTER TABLE bank_transfer_payments DROP CONSTRAINT IF EXISTS "CHK_bank_transfer_payments_pack";
ALTER TABLE bank_transfer_payments ADD CONSTRAINT "CHK_bank_transfer_payments_pack"
  CHECK ("pack" IN ('teOhi', 'umete'));

ALTER TABLE bank_transfer_payments DROP CONSTRAINT IF EXISTS "CHK_bank_transfer_payments_status";
ALTER TABLE bank_transfer_payments ADD CONSTRAINT "CHK_bank_transfer_payments_status"
  CHECK ("status" IN ('pending', 'paid', 'cancelled'));

-- 4) Add needsVerification and pupuInscriptionReceived columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_transfer_payments'
      AND column_name = 'needsVerification'
  ) THEN
    ALTER TABLE bank_transfer_payments ADD COLUMN "needsVerification" BOOLEAN NOT NULL DEFAULT FALSE;
    COMMENT ON COLUMN bank_transfer_payments."needsVerification" IS
      'True si l''utilisateur a demandé une vérification manuelle (droits temporaires accordés en attente de confirmation admin)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_transfer_payments'
      AND column_name = 'pupuInscriptionReceived'
  ) THEN
    ALTER TABLE bank_transfer_payments ADD COLUMN "pupuInscriptionReceived" BOOLEAN NOT NULL DEFAULT FALSE;
    COMMENT ON COLUMN bank_transfer_payments."pupuInscriptionReceived" IS
      'True si les Pūpū d''inscription ont été attribués (50 pour Te Ohi, 100 pour Umete)';
  END IF;
END $$;

-- Index for pending verifications (admin queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'bank_transfer_payments'
      AND indexname = 'IDX_bank_transfer_payments_needsVerification'
  ) THEN
    CREATE INDEX "IDX_bank_transfer_payments_needsVerification"
      ON bank_transfer_payments("needsVerification", "createdAt" DESC)
      WHERE "needsVerification" = TRUE;
  END IF;
END $$;

