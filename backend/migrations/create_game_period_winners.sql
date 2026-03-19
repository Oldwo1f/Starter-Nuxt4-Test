-- Migration: Create game_period_winners table for leaderboard (daily/weekly/monthly winners)
CREATE TABLE IF NOT EXISTS game_period_winners (
  id SERIAL PRIMARY KEY,
  "gameType" VARCHAR(20) NOT NULL CHECK ("gameType" IN ('kikiri', 'bingo')),
  "periodType" VARCHAR(10) NOT NULL CHECK ("periodType" IN ('day', 'week', 'month')),
  "periodStart" DATE NOT NULL,
  "userId" INTEGER NOT NULL,
  "jijiWon" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  CONSTRAINT "FK_game_period_winners_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "UQ_game_period_winner" UNIQUE ("gameType", "periodType", "periodStart", "userId")
);

CREATE INDEX IF NOT EXISTS "IDX_game_period_winners_lookup" ON game_period_winners("gameType", "periodType", "periodStart");
CREATE INDEX IF NOT EXISTS "IDX_game_period_winners_userId" ON game_period_winners("userId");
