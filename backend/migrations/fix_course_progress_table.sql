-- Migration: Fix course_progress table structure
-- Date: 2026-02-21
-- Description: Corriger la structure de la table course_progress pour correspondre à l'entité TypeORM

-- Supprimer les anciennes colonnes si elles existent
ALTER TABLE "course_progress" DROP COLUMN IF EXISTS "videoId";
ALTER TABLE "course_progress" DROP COLUMN IF EXISTS "completed";
ALTER TABLE "course_progress" DROP COLUMN IF EXISTS "progress";
ALTER TABLE "course_progress" DROP COLUMN IF EXISTS "lastWatchedAt";

-- Ajouter les colonnes correctes si elles n'existent pas
ALTER TABLE "course_progress" ADD COLUMN IF NOT EXISTS "completedVideos" INTEGER[] DEFAULT '{}';
ALTER TABLE "course_progress" ADD COLUMN IF NOT EXISTS "lastVideoWatchedId" INTEGER NULL;
ALTER TABLE "course_progress" ADD COLUMN IF NOT EXISTS "progressPercentage" DECIMAL(5,2) DEFAULT 0;

-- Commentaires pour clarifier
COMMENT ON COLUMN "course_progress"."completedVideos" IS 'Array des IDs des vidéos complétées';
COMMENT ON COLUMN "course_progress"."lastVideoWatchedId" IS 'ID de la dernière vidéo regardée';
COMMENT ON COLUMN "course_progress"."progressPercentage" IS 'Pourcentage de progression (0-100)';
