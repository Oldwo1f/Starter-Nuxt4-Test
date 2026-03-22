-- Points attribués par l’administration (badges formateur / soutien)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "formateurPoints" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "soutienPoints" INTEGER NOT NULL DEFAULT 0;
