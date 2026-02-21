-- Migration: Add fileUrl column to goodies table
-- Date: 2026-01-XX
-- Description: Add fileUrl column to allow uploading files (zip, pdf, etc.) for goodies.
--              If fileUrl is set, it takes priority over the link field.

-- Add new fileUrl column
ALTER TABLE goodies ADD COLUMN IF NOT EXISTS "fileUrl" VARCHAR NULL;

-- Add comment to explain the priority logic
COMMENT ON COLUMN goodies."fileUrl" IS 'URL du fichier uploadé (zip, pdf, etc.). Si défini, prend la priorité sur le champ link.';
