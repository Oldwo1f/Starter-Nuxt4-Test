-- ============================================================================
-- Migration Consolidée - Toutes les migrations de ce commit
-- Date: 2026-02-28
-- Description: Regroupe toutes les migrations de ce commit en un seul script
--              pour faciliter l'application sur le serveur
-- ============================================================================
-- 
-- Ce script est idempotent et peut être exécuté plusieurs fois sans erreur.
-- Il regroupe les migrations suivantes:
-- 1. Création de la table todos
-- 2. Création de la table stripe_payments
-- 3. Création de la table legacy_payment_verifications
-- 4. Ajout de la colonne isSearching à la table listings
-- 5. Restauration du rôle superadmin pour alexismomcilovic@gmail.com
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Migration: Create todos table
-- ============================================================================
-- Description: Creates the todos table for internal task management

CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'en_cours',
  "assignedTo" VARCHAR(20) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add check constraints for status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CHK_todos_status'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT "CHK_todos_status"
      CHECK (status IN ('en_cours', 'finish', 'pour_plus_tard'));
  END IF;
END $$;

-- Add check constraints for assignedTo enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CHK_todos_assignedTo'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT "CHK_todos_assignedTo"
      CHECK ("assignedTo" IN ('naho', 'tamiga', 'alexis', 'vai'));
  END IF;
END $$;

-- Create index on status for filtering queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'todos'
      AND indexname = 'IDX_todos_status'
  ) THEN
    CREATE INDEX "IDX_todos_status" ON todos(status);
  END IF;
END $$;

-- Create index on assignedTo for filtering queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'todos'
      AND indexname = 'IDX_todos_assignedTo'
  ) THEN
    CREATE INDEX "IDX_todos_assignedTo" ON todos("assignedTo");
  END IF;
END $$;

-- Create index on createdAt for sorting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'todos'
      AND indexname = 'IDX_todos_createdAt'
  ) THEN
    CREATE INDEX "IDX_todos_createdAt" ON todos("createdAt" DESC);
  END IF;
END $$;

-- ============================================================================
-- 2. Migration: Create stripe_payments table
-- ============================================================================
-- Description: Creates stripe_payments table to store Stripe checkout sessions and payment status

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

-- ============================================================================
-- 3. Migration: Create legacy_payment_verifications table
-- ============================================================================
-- Description: Creates the legacy_payment_verifications table to store verification requests
--              for payments made with Naho or Tamiga on the old system.

CREATE TABLE IF NOT EXISTS legacy_payment_verifications (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "paidWith" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "pupuInscriptionReceived" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Constraints & indexes (idempotent)
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

-- ============================================================================
-- 4. Migration: Add isSearching column to listings table
-- ============================================================================
-- Description: Add isSearching column to allow marking listings as "Je recherche" (expressing a need).
--              These listings don't require images or price in Pūpū.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS "isSearching" BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the purpose
COMMENT ON COLUMN listings."isSearching" IS 'Flag pour les annonces "Je recherche" qui expriment un besoin. Ces annonces n''ont pas besoin d''images ni de valeur en Pūpū.';

-- ============================================================================
-- 5. Migration: Restore superadmin role
-- ============================================================================
-- Description: Restore superadmin role for user alexismomcilovic@gmail.com

UPDATE users
SET role = 'superadmin'
WHERE email = 'alexismomcilovic@gmail.com';

-- ============================================================================
-- Vérification finale
-- ============================================================================

-- Vérifier que toutes les tables ont été créées
DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'todos') THEN
    missing_tables := array_append(missing_tables, 'todos');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_payments') THEN
    missing_tables := array_append(missing_tables, 'stripe_payments');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legacy_payment_verifications') THEN
    missing_tables := array_append(missing_tables, 'legacy_payment_verifications');
  END IF;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Tables manquantes après migration: %', array_to_string(missing_tables, ', ');
  END IF;
END $$;

-- Vérifier que la colonne isSearching existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'isSearching'
  ) THEN
    RAISE EXCEPTION 'Colonne isSearching manquante dans la table listings';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Migration terminée avec succès!
-- ============================================================================
-- Tables créées:
--   ✅ todos
--   ✅ stripe_payments
--   ✅ legacy_payment_verifications
-- Colonnes ajoutées:
--   ✅ listings.isSearching
-- Rôle restauré:
--   ✅ superadmin pour alexismomcilovic@gmail.com
-- ============================================================================
