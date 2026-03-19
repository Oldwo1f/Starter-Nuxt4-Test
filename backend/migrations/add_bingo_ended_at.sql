-- Migration: Add endedAt to bingo_rounds for period attribution in leaderboard
ALTER TABLE bingo_rounds ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP NULL;
