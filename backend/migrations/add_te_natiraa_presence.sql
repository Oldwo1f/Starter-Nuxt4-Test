-- Te Natira'a — présence (QR) + compteur utilisateur pour badges Connecter
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "tenatiraaPresencePoints" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS te_natiraa_presence_codes (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(255) NULL,
  "eventId" INTEGER NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "FK_presence_codes_event"
    FOREIGN KEY ("eventId") REFERENCES te_natiraa_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_te_natiraa_presence_codes_eventId"
  ON te_natiraa_presence_codes("eventId");

CREATE TABLE IF NOT EXISTS te_natiraa_presence_claims (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "presenceCodeId" INTEGER NOT NULL,
  "claimedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_presence_claim_user_code" UNIQUE ("userId", "presenceCodeId"),
  CONSTRAINT "FK_presence_claims_user"
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "FK_presence_claims_code"
    FOREIGN KEY ("presenceCodeId") REFERENCES te_natiraa_presence_codes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_te_natiraa_presence_claims_userId"
  ON te_natiraa_presence_claims("userId");
