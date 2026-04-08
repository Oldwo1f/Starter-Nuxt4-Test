-- Preuve de virement (capture d’écran) pour les demandes CCP / Déblock
ALTER TABLE manual_transfer_flow_verifications
  ADD COLUMN IF NOT EXISTS "proofImageUrl" VARCHAR(512) NULL;
