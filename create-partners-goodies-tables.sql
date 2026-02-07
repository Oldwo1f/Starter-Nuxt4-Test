-- Script SQL pour créer les tables partners et goodies
-- À exécuter dans le conteneur postgres

-- Table partners
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  link VARCHAR,
  "bannerHorizontalUrl" VARCHAR,
  "bannerVerticalUrl" VARCHAR,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Table goodies
CREATE TABLE IF NOT EXISTS goodies (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  link VARCHAR,
  description TEXT,
  "imageUrl" VARCHAR,
  "offeredByName" VARCHAR,
  "offeredByLink" VARCHAR,
  "isPublic" BOOLEAN DEFAULT true,
  "createdById" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "FK_goodies_createdBy" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS "IDX_goodies_createdById" ON goodies("createdById");
CREATE INDEX IF NOT EXISTS "IDX_goodies_isPublic" ON goodies("isPublic");

-- Vérifier que les tables ont été créées
SELECT 'Tables créées avec succès!' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('partners', 'goodies');
