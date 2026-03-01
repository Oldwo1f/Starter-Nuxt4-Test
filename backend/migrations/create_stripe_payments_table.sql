-- Migration: Create stripe_payments table
-- Date: 2026-02-27
-- Description:
-- - Creates stripe_payments table to store Stripe checkout sessions and payment status

-- Create stripe_payments table (idempotent)
CREATE TABLE IF NOT EXISTS stripe_payments (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "pack" VARCHAR(20) NOT NULL,
  "amountXpf" INTEGER NOT NULL,
  "stripeSessionId" VARCHAR(255) NULL,
  "stripePaymentIntentId" VARCHAR(255) NULL,
  "stripeCustomerId" VARCHAR(255) NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "paidAt" TIMESTAMP NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Constraints & indexes (idempotent)
-- stripeSessionId uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'stripe_payments'
      AND indexname = 'IDX_stripe_payments_stripeSessionId'
  ) THEN
    CREATE UNIQUE INDEX "IDX_stripe_payments_stripeSessionId"
      ON stripe_payments("stripeSessionId")
      WHERE "stripeSessionId" IS NOT NULL;
  END IF;
END $$;

-- userId index (to fetch latest per user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'stripe_payments'
      AND indexname = 'IDX_stripe_payments_userId_createdAt'
  ) THEN
    CREATE INDEX "IDX_stripe_payments_userId_createdAt"
      ON stripe_payments("userId", "createdAt" DESC);
  END IF;
END $$;

-- status index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'stripe_payments'
      AND indexname = 'IDX_stripe_payments_status'
  ) THEN
    CREATE INDEX "IDX_stripe_payments_status"
      ON stripe_payments("status");
  END IF;
END $$;

-- basic check constraints (drop+recreate to be safe)
ALTER TABLE stripe_payments DROP CONSTRAINT IF EXISTS "CHK_stripe_payments_pack";
ALTER TABLE stripe_payments ADD CONSTRAINT "CHK_stripe_payments_pack"
  CHECK ("pack" IN ('teOhi', 'umete'));

ALTER TABLE stripe_payments DROP CONSTRAINT IF EXISTS "CHK_stripe_payments_status";
ALTER TABLE stripe_payments ADD CONSTRAINT "CHK_stripe_payments_status"
  CHECK ("status" IN ('pending', 'paid', 'cancelled', 'failed'));
