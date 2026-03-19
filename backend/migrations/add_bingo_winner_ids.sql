-- Migration: Add winnerIds to bingo_rounds for ex æquo (multiple winners sharing jackpot)
ALTER TABLE bingo_rounds ADD COLUMN IF NOT EXISTS "winnerIds" JSONB NULL;
