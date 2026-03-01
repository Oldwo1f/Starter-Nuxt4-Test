-- Migration: Create legacy_payment_verifications table
-- Date: 2026-02-28
-- Description: Creates the legacy_payment_verifications table to store verification requests for payments made with Naho or Tamiga on the old system.

-- 1) Create legacy_payment_verifications table (idempotent)
CREATE TABLE IF NOT EXISTS legacy_payment_verifications (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "paidWith" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "pupuInscriptionReceived" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2) Constraints & indexes (idempotent)
-- paidWith check constraint
ALTER TABLE legacy_payment_verifications DROP CONSTRAINT IF EXISTS "CHK_legacy_payment_verifications_paidWith";
ALTER TABLE legacy_payment_verifications ADD CONSTRAINT "CHK_legacy_payment_verifications_paidWith"
  CHECK ("paidWith" IN ('naho', 'tamiga'));

-- status check constraint
ALTER TABLE legacy_payment_verifications DROP CONSTRAINT IF EXISTS "CHK_legacy_payment_verifications_status";
ALTER TABLE legacy_payment_verifications ADD CONSTRAINT "CHK_legacy_payment_verifications_status"
  CHECK ("status" IN ('pending', 'confirmed', 'rejected'));

-- userId index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'legacy_payment_verifications'
      AND indexname = 'IDX_legacy_payment_verifications_userId_createdAt'
  ) THEN
    CREATE INDEX "IDX_legacy_payment_verifications_userId_createdAt"
      ON legacy_payment_verifications("userId", "createdAt" DESC);
  END IF;
END $$;

-- status index for admin queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'legacy_payment_verifications'
      AND indexname = 'IDX_legacy_payment_verifications_status_createdAt'
  ) THEN
    CREATE INDEX "IDX_legacy_payment_verifications_status_createdAt"
      ON legacy_payment_verifications("status", "createdAt" DESC)
      WHERE "status" = 'pending';
  END IF;
END $$;
