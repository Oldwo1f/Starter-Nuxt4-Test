#!/bin/bash

# Script pour corriger la structure de la table course_progress

set -e

echo "🔧 Correction de la structure de la table course_progress"
echo "========================================================="
echo ""

# Détecter docker-compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

# Vérifier que le container postgres est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^nunaheritage-postgres$"; then
    echo "❌ Le container nunaheritage-postgres n'est pas en cours d'exécution"
    exit 1
fi

# Charger les variables d'environnement si .env existe
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Valeurs par défaut
DB_USERNAME=${DB_USERNAME:-postgres}
DB_NAME=${DB_NAME:-nunaheritage}

echo "📊 Connexion à la base de données: $DB_NAME"
echo ""

# Exécuter la migration
echo "🔧 Correction de la structure de la table course_progress..."
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
-- Migration: Fix course_progress table structure
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

SELECT 'Structure de course_progress corrigée' AS result;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Structure de la table course_progress corrigée avec succès!"
    echo ""
    echo "Vérification de la structure..."
    docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -c "\d course_progress" | grep -E "completedVideos|lastVideoWatchedId|progressPercentage" || echo "⚠️  Impossible de vérifier (mais la migration a réussi)"
    echo ""
    echo "✅ La table course_progress est maintenant conforme à l'entité TypeORM"
else
    echo ""
    echo "❌ Erreur lors de la correction de la structure"
    exit 1
fi
