-- Migration: Create Bingo 75 tables
-- Description: Bingo game with config, sessions, rounds, grids, chat

-- Create bingo_config table (singleton, id=1)
CREATE TABLE IF NOT EXISTS bingo_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  mode VARCHAR(20) NOT NULL DEFAULT 'cruise',
  "manualEnabled" BOOLEAN NOT NULL DEFAULT false,
  "openHour" SMALLINT NOT NULL DEFAULT 9,
  "openMinute" SMALLINT NOT NULL DEFAULT 0,
  "closeHour" SMALLINT NOT NULL DEFAULT 18,
  "closeMinute" SMALLINT NOT NULL DEFAULT 0,
  "drawSpeed" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO bingo_config (id, mode, "manualEnabled", "openHour", "openMinute", "closeHour", "closeMinute", "drawSpeed")
SELECT 1, 'cruise', false, 9, 0, 18, 0, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM bingo_config WHERE id = 1);

-- Create bingo_sessions table
CREATE TABLE IF NOT EXISTS bingo_sessions (
  id SERIAL PRIMARY KEY,
  "openedAt" TIMESTAMP NOT NULL,
  "closedAt" TIMESTAMP NULL,
  "bankNet" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create bingo_rounds table
CREATE TABLE IF NOT EXISTS bingo_rounds (
  id SERIAL PRIMARY KEY,
  phase VARCHAR(20) NOT NULL DEFAULT 'purchase',
  "purchaseEndsAt" TIMESTAMP NOT NULL,
  jackpot DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "drawnBalls" JSONB NOT NULL DEFAULT '[]',
  "drawingStartedAt" TIMESTAMP NULL,
  "winnerId" INTEGER NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "sessionId" INTEGER NULL,
  CONSTRAINT "FK_bingo_rounds_session" FOREIGN KEY ("sessionId") REFERENCES bingo_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_bingo_rounds_sessionId" ON bingo_rounds("sessionId");
CREATE INDEX IF NOT EXISTS "IDX_bingo_rounds_phase" ON bingo_rounds(phase);

-- Create bingo_grids table
CREATE TABLE IF NOT EXISTS bingo_grids (
  id SERIAL PRIMARY KEY,
  "roundId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  numbers JSONB NOT NULL,
  "gridIndex" SMALLINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "FK_bingo_grids_round" FOREIGN KEY ("roundId") REFERENCES bingo_rounds(id) ON DELETE CASCADE,
  CONSTRAINT "FK_bingo_grids_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_bingo_grids_roundId" ON bingo_grids("roundId");
CREATE INDEX IF NOT EXISTS "IDX_bingo_grids_userId" ON bingo_grids("userId");

-- Create bingo_chat_messages table
CREATE TABLE IF NOT EXISTS bingo_chat_messages (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "FK_bingo_chat_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_bingo_chat_createdAt" ON bingo_chat_messages("createdAt");
