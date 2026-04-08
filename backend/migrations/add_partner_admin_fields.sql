-- Champs contact / premium pour l’administration des partenaires
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS email VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS activity TEXT NULL,
  ADD COLUMN IF NOT EXISTS phone VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS premium BOOLEAN NOT NULL DEFAULT false;
