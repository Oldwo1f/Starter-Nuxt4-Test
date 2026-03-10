-- Migration: Create conversations and messages tables for one-to-one messaging
-- Date: 2026-03-10
-- Description: Creates the conversations and messages tables for troqueur messaging

-- Create conversations table (idempotent)
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  "participant1Id" INTEGER NOT NULL,
  "participant2Id" INTEGER NOT NULL,
  "listingId" INTEGER NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "FK_conversations_participant1Id" FOREIGN KEY ("participant1Id") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "FK_conversations_participant2Id" FOREIGN KEY ("participant2Id") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "FK_conversations_listingId" FOREIGN KEY ("listingId") REFERENCES listings(id) ON DELETE SET NULL,
  CONSTRAINT "CHK_conversations_participants_order" CHECK ("participant1Id" < "participant2Id")
);

-- Create unique index on participant pair
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'conversations'
      AND indexname = 'IDX_conversations_participants_unique'
  ) THEN
    CREATE UNIQUE INDEX "IDX_conversations_participants_unique"
    ON conversations("participant1Id", "participant2Id");
  END IF;
END $$;

-- Create indexes on conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'conversations'
      AND indexname = 'IDX_conversations_participant1Id'
  ) THEN
    CREATE INDEX "IDX_conversations_participant1Id" ON conversations("participant1Id");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'conversations'
      AND indexname = 'IDX_conversations_participant2Id'
  ) THEN
    CREATE INDEX "IDX_conversations_participant2Id" ON conversations("participant2Id");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'conversations'
      AND indexname = 'IDX_conversations_updatedAt'
  ) THEN
    CREATE INDEX "IDX_conversations_updatedAt" ON conversations("updatedAt" DESC);
  END IF;
END $$;

-- Create messages table (idempotent)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  "conversationId" INTEGER NOT NULL,
  "senderId" INTEGER NOT NULL,
  content TEXT NOT NULL,
  "readAt" TIMESTAMP NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "FK_messages_conversationId" FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT "FK_messages_senderId" FOREIGN KEY ("senderId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes on messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'messages'
      AND indexname = 'IDX_messages_conversationId'
  ) THEN
    CREATE INDEX "IDX_messages_conversationId" ON messages("conversationId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'messages'
      AND indexname = 'IDX_messages_senderId'
  ) THEN
    CREATE INDEX "IDX_messages_senderId" ON messages("senderId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'messages'
      AND indexname = 'IDX_messages_createdAt'
  ) THEN
    CREATE INDEX "IDX_messages_createdAt" ON messages("createdAt" ASC);
  END IF;
END $$;
