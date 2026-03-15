-- Migration: Create te_natiraa_events table and add eventId to registrations
-- Date: 2026-03-15
-- Description: Multi-event support for Te Natira'a

-- 1. Create te_natiraa_events table
CREATE TABLE IF NOT EXISTS te_natiraa_events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "eventDate" DATE NOT NULL,
  "eventTime" VARCHAR(20) NOT NULL DEFAULT '8h00',
  location VARCHAR(255) NOT NULL,
  description TEXT NULL,
  "stripePriceMemberId" VARCHAR(255) NULL,
  "stripePricePublicId" VARCHAR(255) NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Insert default event (11 avril 2026 - Vallée de Tipaerui)
INSERT INTO te_natiraa_events (name, "eventDate", "eventTime", location, "isActive")
SELECT 'Te Natira''a - Avril 2026', '2026-04-11'::date, '8h00', 'Vallée de Tipaerui', true
WHERE NOT EXISTS (SELECT 1 FROM te_natiraa_events LIMIT 1);

-- 3. Add eventId to te_natiraa_registrations (nullable first)
ALTER TABLE te_natiraa_registrations
  ADD COLUMN IF NOT EXISTS "eventId" INTEGER NULL;

-- 4. Assign existing registrations to the first event
UPDATE te_natiraa_registrations r
SET "eventId" = (SELECT id FROM te_natiraa_events ORDER BY "eventDate" ASC LIMIT 1)
WHERE r."eventId" IS NULL;

-- 5. Make eventId NOT NULL
ALTER TABLE te_natiraa_registrations
  ALTER COLUMN "eventId" SET NOT NULL;

-- 6. Add foreign key
ALTER TABLE te_natiraa_registrations
  DROP CONSTRAINT IF EXISTS "FK_te_natiraa_registrations_event";
ALTER TABLE te_natiraa_registrations
  ADD CONSTRAINT "FK_te_natiraa_registrations_event"
  FOREIGN KEY ("eventId") REFERENCES te_natiraa_events(id) ON DELETE CASCADE;

-- 7. Index for eventId
CREATE INDEX IF NOT EXISTS "IDX_te_natiraa_registrations_eventId"
  ON te_natiraa_registrations("eventId");
