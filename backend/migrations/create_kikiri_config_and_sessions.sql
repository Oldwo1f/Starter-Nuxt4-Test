-- Migration: Create kikiri_config and kikiri_sessions tables
-- Date: 2026-03-16
-- Description: Adds Kikiri scheduling (manual/cruise modes) and session tracking

-- Create kikiri_config table (singleton, id=1)
CREATE TABLE IF NOT EXISTS kikiri_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  mode VARCHAR(20) NOT NULL DEFAULT 'cruise',
  "manualEnabled" BOOLEAN NOT NULL DEFAULT false,
  "openHour" SMALLINT NOT NULL DEFAULT 9,
  "openMinute" SMALLINT NOT NULL DEFAULT 0,
  "closeHour" SMALLINT NOT NULL DEFAULT 18,
  "closeMinute" SMALLINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default config if not exists (PostgreSQL 9.5+)
INSERT INTO kikiri_config (id, mode, "manualEnabled", "openHour", "openMinute", "closeHour", "closeMinute")
SELECT 1, 'cruise', false, 9, 0, 18, 0
WHERE NOT EXISTS (SELECT 1 FROM kikiri_config WHERE id = 1);

-- Create kikiri_sessions table
CREATE TABLE IF NOT EXISTS kikiri_sessions (
  id SERIAL PRIMARY KEY,
  "openedAt" TIMESTAMP NOT NULL,
  "closedAt" TIMESTAMP NULL,
  "bankNet" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add sessionId to kikiri_draws if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kikiri_draws' AND column_name = 'sessionId'
  ) THEN
    ALTER TABLE kikiri_draws ADD COLUMN "sessionId" INTEGER NULL;
    ALTER TABLE kikiri_draws ADD CONSTRAINT "FK_kikiri_draws_sessionId"
      FOREIGN KEY ("sessionId") REFERENCES kikiri_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for session lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'kikiri_draws' AND indexname = 'IDX_kikiri_draws_sessionId'
  ) THEN
    CREATE INDEX "IDX_kikiri_draws_sessionId" ON kikiri_draws("sessionId");
  END IF;
END $$;
