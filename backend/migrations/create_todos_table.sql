-- Migration: Create todos table
-- Date: 2026-01-XX
-- Description: Creates the todos table for internal task management

-- Create todos table (idempotent)
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'en_cours',
  "assignedTo" VARCHAR(20) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add check constraints for status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CHK_todos_status'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT "CHK_todos_status"
      CHECK (status IN ('en_cours', 'finish', 'pour_plus_tard'));
  END IF;
END $$;

-- Add check constraints for assignedTo enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CHK_todos_assignedTo'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT "CHK_todos_assignedTo"
      CHECK ("assignedTo" IN ('naho', 'tamiga', 'alexis', 'vai'));
  END IF;
END $$;

-- Create index on status for filtering queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'todos'
      AND indexname = 'IDX_todos_status'
  ) THEN
    CREATE INDEX "IDX_todos_status" ON todos(status);
  END IF;
END $$;

-- Create index on assignedTo for filtering queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'todos'
      AND indexname = 'IDX_todos_assignedTo'
  ) THEN
    CREATE INDEX "IDX_todos_assignedTo" ON todos("assignedTo");
  END IF;
END $$;

-- Create index on createdAt for sorting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'todos'
      AND indexname = 'IDX_todos_createdAt'
  ) THEN
    CREATE INDEX "IDX_todos_createdAt" ON todos("createdAt" DESC);
  END IF;
END $$;
