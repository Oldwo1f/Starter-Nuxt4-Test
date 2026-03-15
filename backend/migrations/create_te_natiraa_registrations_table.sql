-- Migration: Create te_natiraa_registrations table
-- Date: 2026-03-15
-- Description:
-- - Creates te_natiraa_registrations table for Te Natira'a event registrations

-- Create te_natiraa_registrations table (idempotent)
CREATE TABLE IF NOT EXISTS te_natiraa_registrations (
  id SERIAL PRIMARY KEY,
  "firstName" VARCHAR(255) NOT NULL,
  "lastName" VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  "adultCount" INTEGER NOT NULL DEFAULT 0,
  "childCount" INTEGER NOT NULL DEFAULT 0,
  "userId" INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  "stripeSessionId" VARCHAR(255) NULL,
  "qrCode" VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  "validatedAt" TIMESTAMP NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Constraints & indexes (idempotent)
-- stripeSessionId uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'te_natiraa_registrations'
      AND indexname = 'IDX_te_natiraa_registrations_stripeSessionId'
  ) THEN
    CREATE UNIQUE INDEX "IDX_te_natiraa_registrations_stripeSessionId"
      ON te_natiraa_registrations("stripeSessionId")
      WHERE "stripeSessionId" IS NOT NULL;
  END IF;
END $$;

-- qrCode uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'te_natiraa_registrations'
      AND indexname = 'IDX_te_natiraa_registrations_qrCode'
  ) THEN
    CREATE UNIQUE INDEX "IDX_te_natiraa_registrations_qrCode"
      ON te_natiraa_registrations("qrCode");
  END IF;
END $$;

-- status index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'te_natiraa_registrations'
      AND indexname = 'IDX_te_natiraa_registrations_status'
  ) THEN
    CREATE INDEX "IDX_te_natiraa_registrations_status"
      ON te_natiraa_registrations(status);
  END IF;
END $$;

-- createdAt index for listing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'te_natiraa_registrations'
      AND indexname = 'IDX_te_natiraa_registrations_createdAt'
  ) THEN
    CREATE INDEX "IDX_te_natiraa_registrations_createdAt"
      ON te_natiraa_registrations("createdAt" DESC);
  END IF;
END $$;

-- status check constraint
ALTER TABLE te_natiraa_registrations DROP CONSTRAINT IF EXISTS "CHK_te_natiraa_registrations_status";
ALTER TABLE te_natiraa_registrations ADD CONSTRAINT "CHK_te_natiraa_registrations_status"
  CHECK (status IN ('pending', 'paid', 'validated'));
