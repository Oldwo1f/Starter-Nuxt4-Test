-- Migration: Create base Kikiri tables (kikiri_draws, kikiri_bets, kikiri_chat_messages)
-- Must run BEFORE migrate:kikiri-config (which adds sessionId to kikiri_draws)
-- Date: 2026-03-19

-- Create kikiri_draws table (sessionId added later by kikiri-config migration)
CREATE TABLE IF NOT EXISTS kikiri_draws (
  id SERIAL PRIMARY KEY,
  "dice1" SMALLINT NULL,
  "dice2" SMALLINT NULL,
  "dice3" SMALLINT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'betting',
  "bettingEndsAt" TIMESTAMP NOT NULL,
  "resolvedAt" TIMESTAMP NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE kikiri_draws DROP CONSTRAINT IF EXISTS "CHK_kikiri_draws_status";
ALTER TABLE kikiri_draws ADD CONSTRAINT "CHK_kikiri_draws_status"
  CHECK (status IN ('betting', 'revealing', 'resolved'));

CREATE INDEX IF NOT EXISTS "IDX_kikiri_draws_status" ON kikiri_draws(status);
CREATE INDEX IF NOT EXISTS "IDX_kikiri_draws_bettingEndsAt" ON kikiri_draws("bettingEndsAt");

-- Create kikiri_bets table
CREATE TABLE IF NOT EXISTS kikiri_bets (
  id SERIAL PRIMARY KEY,
  "drawId" INTEGER NOT NULL REFERENCES kikiri_draws(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  number SMALLINT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  result VARCHAR(20) NOT NULL DEFAULT 'pending',
  "winAmount" DECIMAL(10, 2) NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE kikiri_bets DROP CONSTRAINT IF EXISTS "CHK_kikiri_bets_result";
ALTER TABLE kikiri_bets ADD CONSTRAINT "CHK_kikiri_bets_result"
  CHECK (result IN ('pending', 'win', 'lose'));

CREATE INDEX IF NOT EXISTS "IDX_kikiri_bets_drawId" ON kikiri_bets("drawId");
CREATE INDEX IF NOT EXISTS "IDX_kikiri_bets_userId" ON kikiri_bets("userId");

-- Create kikiri_chat_messages table
CREATE TABLE IF NOT EXISTS kikiri_chat_messages (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IDX_kikiri_chat_createdAt" ON kikiri_chat_messages("createdAt");
