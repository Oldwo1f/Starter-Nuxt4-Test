-- Archivage admin : date d’archivage (compte désactivé, données conservées)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP NULL;

COMMENT ON COLUMN users."archivedAt" IS 'Date d’archivage admin ; NULL = compte non archivé';
