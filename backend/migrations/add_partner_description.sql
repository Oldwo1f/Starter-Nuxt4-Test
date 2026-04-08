-- Texte de présentation (page publique partenaires)
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS description TEXT NULL;
