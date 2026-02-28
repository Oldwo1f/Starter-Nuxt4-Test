-- Migration: Create referrals table for the referral system
-- Date: 2026-01-XX
-- Description: Creates the referrals table to track referral relationships between users

-- Create referrals table if it doesn't exist
CREATE TABLE IF NOT EXISTS "referrals" (
    "id" SERIAL PRIMARY KEY,
    "referrerId" INTEGER NOT NULL,
    "referredId" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'inscrit',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_referrals_referrer" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_referrals_referred" FOREIGN KEY ("referredId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "UQ_referrals_referrer_referred" UNIQUE ("referrerId", "referredId"),
    CONSTRAINT "CHK_referrals_status" CHECK ("status" IN ('inscrit', 'membre', 'validee'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_referrals_referrerId" ON "referrals"("referrerId");
CREATE INDEX IF NOT EXISTS "IDX_referrals_referredId" ON "referrals"("referredId");
CREATE INDEX IF NOT EXISTS "IDX_referrals_status" ON "referrals"("status");

-- Add comments
COMMENT ON TABLE "referrals" IS 'Table des relations de parrainage entre utilisateurs';
COMMENT ON COLUMN "referrals"."referrerId" IS 'ID du parrain (celui qui a partagé son code)';
COMMENT ON COLUMN "referrals"."referredId" IS 'ID du filleul (celui qui s''est inscrit avec le code)';
COMMENT ON COLUMN "referrals"."status" IS 'Statut: inscrit (inscrit mais pas encore membre), membre (devenu membre), validee (récompense créditée)';
