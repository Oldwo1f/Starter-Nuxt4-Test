-- Migration pour créer les tables partners et goodies
-- À exécuter si synchronize est false en production

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

-- Créer un index sur createdById pour améliorer les performances
CREATE INDEX IF NOT EXISTS "IDX_goodies_createdById" ON goodies("createdById");

-- Créer un index sur isPublic pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS "IDX_goodies_isPublic" ON goodies("isPublic");
