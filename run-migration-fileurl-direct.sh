#!/bin/bash

# Script pour exécuter directement la migration fileUrl via psql

set -e

echo "🔄 Exécution de la migration fileUrl pour la table goodies..."
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

# Exécuter la migration SQL directement
echo "🔧 Ajout de la colonne fileUrl à la table goodies..."
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
-- Migration: Add fileUrl column to goodies table
ALTER TABLE goodies ADD COLUMN IF NOT EXISTS "fileUrl" VARCHAR NULL;
COMMENT ON COLUMN goodies."fileUrl" IS 'URL du fichier uploadé (zip, pdf, etc.). Si défini, prend la priorité sur le champ link.';
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration terminée avec succès!"
    echo ""
    echo "Vérification de la colonne..."
    docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -c "\d goodies" | grep -i fileurl || echo "⚠️  Colonne non visible (peut être normal si la commande \d échoue)"
    echo ""
    echo "✅ La colonne fileUrl a été ajoutée à la table goodies"
else
    echo ""
    echo "❌ Erreur lors de l'exécution de la migration"
    exit 1
fi
