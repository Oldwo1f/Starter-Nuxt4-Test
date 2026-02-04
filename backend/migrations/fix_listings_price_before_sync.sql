-- Migration: Fix listings table before TypeORM synchronize
-- This script should be run BEFORE starting the backend to fix existing data
-- Date: 2024

-- Step 1: Update any NULL prices to 0 (or delete those listings)
UPDATE listings 
SET price = 0 
WHERE price IS NULL;

-- Step 2: Round all decimal prices to integers
UPDATE listings 
SET price = ROUND(price::numeric)::integer 
WHERE price IS NOT NULL;

-- Step 3: Ensure price is NOT NULL (if column allows NULL)
ALTER TABLE listings 
ALTER COLUMN price SET NOT NULL;

-- Step 4: Add priceUnit column if it doesn't exist (nullable for now)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS "priceUnit" VARCHAR(50) NULL;

-- Step 5: Set default priceUnit for existing listings
-- Services default to "par heure"
UPDATE listings 
SET "priceUnit" = 'par heure' 
WHERE type = 'service' AND "priceUnit" IS NULL;

-- Biens default to "l'unité"
UPDATE listings 
SET "priceUnit" = 'l\'unité' 
WHERE type = 'bien' AND "priceUnit" IS NULL;

-- Note: After running this script, TypeORM synchronize should work correctly
-- The synchronize will change price from decimal to integer
