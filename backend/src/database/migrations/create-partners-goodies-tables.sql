-- Migration pour créer les tables partners et goodies
-- À exécuter si synchronize est false en production
-- Idempotent : tables déjà présentes = ajout des colonnes manquantes (pas isPublic : remplacé par accessLevel)

-- Table partners
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  link VARCHAR,
  "bannerHorizontalUrl" VARCHAR,
  "bannerVerticalUrl" VARCHAR,
  email VARCHAR,
  activity TEXT,
  description TEXT,
  phone VARCHAR,
  premium BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Table goodies (schéma aligné sur TypeORM : accessLevel + fileUrl, pas isPublic)
CREATE TABLE IF NOT EXISTS goodies (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  link VARCHAR,
  description TEXT,
  "imageUrl" VARCHAR,
  "offeredByName" VARCHAR,
  "offeredByLink" VARCHAR,
  "fileUrl" VARCHAR,
  "accessLevel" VARCHAR(20) NOT NULL DEFAULT 'public',
  "createdById" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "FK_goodies_createdBy" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL
);

-- Bases avec ancienne colonne isPublic uniquement : migrer vers accessLevel
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goodies' AND column_name = 'isPublic'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goodies' AND column_name = 'accessLevel'
  ) THEN
    ALTER TABLE goodies ADD COLUMN "accessLevel" VARCHAR(20) DEFAULT 'public';
    UPDATE goodies SET "accessLevel" = CASE
      WHEN "isPublic" IS TRUE THEN 'public'
      WHEN "isPublic" IS FALSE THEN 'member'
      ELSE 'public'
    END;
    ALTER TABLE goodies ALTER COLUMN "accessLevel" SET NOT NULL;
    ALTER TABLE goodies ALTER COLUMN "accessLevel" SET DEFAULT 'public';
    DROP INDEX IF EXISTS "IDX_goodies_isPublic";
    ALTER TABLE goodies DROP COLUMN "isPublic";
  END IF;
END $$;

-- Colonnes manquantes sur une goodies déjà créée (schéma minimal ou intermédiaire)
ALTER TABLE goodies
  ADD COLUMN IF NOT EXISTS link VARCHAR,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR,
  ADD COLUMN IF NOT EXISTS "offeredByName" VARCHAR,
  ADD COLUMN IF NOT EXISTS "offeredByLink" VARCHAR,
  ADD COLUMN IF NOT EXISTS "fileUrl" VARCHAR,
  ADD COLUMN IF NOT EXISTS "accessLevel" VARCHAR(20) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS "createdById" INTEGER,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Index obsolète (colonne supprimée ou jamais présente sur cette base)
DROP INDEX IF EXISTS "IDX_goodies_isPublic";

UPDATE goodies SET "accessLevel" = 'public' WHERE "accessLevel" IS NULL;
ALTER TABLE goodies ALTER COLUMN "accessLevel" SET DEFAULT 'public';
ALTER TABLE goodies ALTER COLUMN "accessLevel" SET NOT NULL;

ALTER TABLE goodies DROP CONSTRAINT IF EXISTS "CHK_goodies_accessLevel";
ALTER TABLE goodies ADD CONSTRAINT "CHK_goodies_accessLevel"
  CHECK ("accessLevel" IN ('public', 'member', 'premium', 'vip'));

-- FK si la table existait sans contrainte nommée
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_goodies_createdBy'
  ) THEN
    ALTER TABLE goodies
      ADD CONSTRAINT "FK_goodies_createdBy"
      FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_goodies_createdById" ON goodies("createdById");

DROP INDEX IF EXISTS "IDX_goodies_accessLevel";
CREATE INDEX IF NOT EXISTS "IDX_goodies_accessLevel" ON goodies("accessLevel");
