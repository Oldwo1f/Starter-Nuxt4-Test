-- Migration: Add isSearching column to listings table
-- Date: 2026-01-XX
-- Description: Add isSearching column to allow marking listings as "Je recherche" (expressing a need).
--              These listings don't require images or price in Pūpū.

-- Add new isSearching column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS "isSearching" BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the purpose
COMMENT ON COLUMN listings."isSearching" IS 'Flag pour les annonces "Je recherche" qui expriment un besoin. Ces annonces n''ont pas besoin d''images ni de valeur en Pūpū.';
