-- Migration: Add grid_price to bingo_config
-- Description: Prix d'une grille en jetons Jiji (défaut 50)

ALTER TABLE bingo_config
ADD COLUMN IF NOT EXISTS "gridPrice" INTEGER NOT NULL DEFAULT 50;
