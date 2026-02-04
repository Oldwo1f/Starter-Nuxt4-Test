-- Migration: Add priceUnit field to listings table and change price to integer
-- Date: 2024

-- Step 1: Add priceUnit column (nullable)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS "priceUnit" VARCHAR(50) NULL;

-- Step 2: Convert price from decimal to integer
-- First, ensure all prices are integers (round them)
UPDATE listings 
SET price = ROUND(price::numeric)::integer 
WHERE price IS NOT NULL;

-- Step 3: Change price column type from decimal to integer
ALTER TABLE listings 
ALTER COLUMN price TYPE INTEGER USING ROUND(price::numeric)::integer;

-- Note: In development, TypeORM synchronize will handle this automatically.
-- This migration is for production environments where synchronize is disabled.
