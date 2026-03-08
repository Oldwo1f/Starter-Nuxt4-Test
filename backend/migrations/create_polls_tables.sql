-- Migration: Create polls tables
-- Date: 2026-03-XX
-- Description: Creates the polls, poll_options, and poll_responses tables for the polling system

-- Create polls table (idempotent)
CREATE TABLE IF NOT EXISTS polls (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type VARCHAR(20) NOT NULL,
  "accessLevel" VARCHAR(20) NOT NULL DEFAULT 'public',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add check constraints for type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CHK_polls_type'
  ) THEN
    ALTER TABLE polls ADD CONSTRAINT "CHK_polls_type"
      CHECK (type IN ('qcm', 'ranking'));
  END IF;
END $$;

-- Add check constraints for accessLevel enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CHK_polls_accessLevel'
  ) THEN
    ALTER TABLE polls ADD CONSTRAINT "CHK_polls_accessLevel"
      CHECK ("accessLevel" IN ('public', 'member'));
  END IF;
END $$;

-- Add check constraints for status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CHK_polls_status'
  ) THEN
    ALTER TABLE polls ADD CONSTRAINT "CHK_polls_status"
      CHECK (status IN ('draft', 'active', 'ended'));
  END IF;
END $$;

-- Create poll_options table (idempotent)
CREATE TABLE IF NOT EXISTS poll_options (
  id SERIAL PRIMARY KEY,
  "pollId" INTEGER NOT NULL,
  text VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "FK_poll_options_pollId" FOREIGN KEY ("pollId") REFERENCES polls(id) ON DELETE CASCADE
);

-- Create poll_responses table (idempotent)
CREATE TABLE IF NOT EXISTS poll_responses (
  id SERIAL PRIMARY KEY,
  "pollId" INTEGER NOT NULL,
  "userId" INTEGER NULL,
  "optionId" INTEGER NULL,
  ranking JSONB NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "FK_poll_responses_pollId" FOREIGN KEY ("pollId") REFERENCES polls(id) ON DELETE CASCADE,
  CONSTRAINT "FK_poll_responses_userId" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "FK_poll_responses_optionId" FOREIGN KEY ("optionId") REFERENCES poll_options(id) ON DELETE CASCADE
);

-- Create unique index on pollId + userId to prevent duplicate responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'poll_responses'
      AND indexname = 'IDX_poll_responses_pollId_userId_unique'
  ) THEN
    CREATE UNIQUE INDEX "IDX_poll_responses_pollId_userId_unique" 
    ON poll_responses("pollId", "userId") 
    WHERE "userId" IS NOT NULL;
  END IF;
END $$;

-- Create indexes on polls table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'polls'
      AND indexname = 'IDX_polls_status'
  ) THEN
    CREATE INDEX "IDX_polls_status" ON polls(status);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'polls'
      AND indexname = 'IDX_polls_accessLevel'
  ) THEN
    CREATE INDEX "IDX_polls_accessLevel" ON polls("accessLevel");
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'polls'
      AND indexname = 'IDX_polls_type'
  ) THEN
    CREATE INDEX "IDX_polls_type" ON polls(type);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'polls'
      AND indexname = 'IDX_polls_createdAt'
  ) THEN
    CREATE INDEX "IDX_polls_createdAt" ON polls("createdAt" DESC);
  END IF;
END $$;

-- Create indexes on poll_options table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'poll_options'
      AND indexname = 'IDX_poll_options_pollId'
  ) THEN
    CREATE INDEX "IDX_poll_options_pollId" ON poll_options("pollId");
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'poll_options'
      AND indexname = 'IDX_poll_options_order'
  ) THEN
    CREATE INDEX "IDX_poll_options_order" ON poll_options("order");
  END IF;
END $$;

-- Create indexes on poll_responses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'poll_responses'
      AND indexname = 'IDX_poll_responses_pollId'
  ) THEN
    CREATE INDEX "IDX_poll_responses_pollId" ON poll_responses("pollId");
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'poll_responses'
      AND indexname = 'IDX_poll_responses_userId'
  ) THEN
    CREATE INDEX "IDX_poll_responses_userId" ON poll_responses("userId");
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'poll_responses'
      AND indexname = 'IDX_poll_responses_optionId'
  ) THEN
    CREATE INDEX "IDX_poll_responses_optionId" ON poll_responses("optionId");
  END IF;
END $$;
