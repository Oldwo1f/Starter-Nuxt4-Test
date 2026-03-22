-- Consultations Culture : un enregistrement par (utilisateur, vidéo) — première ouverture du contenu
CREATE TABLE IF NOT EXISTS culture_consultation (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "cultureId" INTEGER NOT NULL REFERENCES cultures(id) ON DELETE CASCADE,
  "consultedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_culture_consultation_user_culture UNIQUE ("userId", "cultureId")
);

CREATE INDEX IF NOT EXISTS idx_culture_consultation_user_id ON culture_consultation ("userId");
