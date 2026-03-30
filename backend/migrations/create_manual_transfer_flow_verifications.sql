-- Manual transfer flow verifications (CCP Marama, Déblock RIB, Déblock instantané)
CREATE TABLE IF NOT EXISTS manual_transfer_flow_verifications (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  "pupuInscriptionReceived" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE manual_transfer_flow_verifications DROP CONSTRAINT IF EXISTS "CHK_manual_transfer_flow_channel";
ALTER TABLE manual_transfer_flow_verifications ADD CONSTRAINT "CHK_manual_transfer_flow_channel"
  CHECK (channel IN ('ccp_marama', 'deblock_rib', 'deblock_instant'));

ALTER TABLE manual_transfer_flow_verifications DROP CONSTRAINT IF EXISTS "CHK_manual_transfer_flow_status";
ALTER TABLE manual_transfer_flow_verifications ADD CONSTRAINT "CHK_manual_transfer_flow_status"
  CHECK (status IN ('pending', 'confirmed', 'rejected'));

CREATE INDEX IF NOT EXISTS "IDX_manual_transfer_flow_userId_createdAt"
  ON manual_transfer_flow_verifications("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "IDX_manual_transfer_flow_status_pending"
  ON manual_transfer_flow_verifications(status) WHERE status = 'pending';
