-- QR codes « point soutien » (optionnellement liés à un partenaire)
CREATE TABLE IF NOT EXISTS partner_soutien_qr_codes (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(255) NULL,
  "partnerId" INTEGER NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "FK_partner_soutien_qr_partner"
    FOREIGN KEY ("partnerId") REFERENCES partners(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_partner_soutien_qr_codes_partnerId"
  ON partner_soutien_qr_codes("partnerId");

CREATE TABLE IF NOT EXISTS partner_soutien_qr_claims (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "soutienQrCodeId" INTEGER NOT NULL,
  "claimedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_partner_soutien_claim_user_code" UNIQUE ("userId", "soutienQrCodeId"),
  CONSTRAINT "FK_partner_soutien_claims_user"
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "FK_partner_soutien_claims_code"
    FOREIGN KEY ("soutienQrCodeId") REFERENCES partner_soutien_qr_codes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_partner_soutien_qr_claims_userId"
  ON partner_soutien_qr_claims("userId");
