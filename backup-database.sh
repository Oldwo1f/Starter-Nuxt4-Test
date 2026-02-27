#!/bin/bash

# Script de sauvegarde de la base de données PostgreSQL
# Usage: ./backup-database.sh [nom-du-backup]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Charger les variables d'environnement
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Variables par défaut
DB_NAME=${DB_NAME:-nunaheritage}
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
CONTAINER_NAME="nunaheritage-postgres"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME=${1:-"backup_${TIMESTAMP}"}
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"

# Créer le répertoire de sauvegarde s'il n'existe pas
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}💾 Sauvegarde de la base de données PostgreSQL${NC}"
echo ""

# Vérifier que le conteneur est en cours d'exécution
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ Le conteneur PostgreSQL '$CONTAINER_NAME' n'est pas en cours d'exécution${NC}"
    echo "Démarrez-le avec: docker-compose up -d postgres"
    exit 1
fi

echo -e "${GREEN}📦 Création de la sauvegarde: ${BACKUP_FILE}${NC}"

# Créer la sauvegarde
docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    pg_dump -U "$DB_USERNAME" -d "$DB_NAME" --clean --if-exists > "$BACKUP_FILE"

# Vérifier que la sauvegarde a réussi
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Sauvegarde créée avec succès!${NC}"
    echo "   Fichier: $BACKUP_FILE"
    echo "   Taille: $BACKUP_SIZE"
    echo ""
    echo "Pour restaurer cette sauvegarde:"
    echo "   docker exec -i -e PGPASSWORD=\"$DB_PASSWORD\" $CONTAINER_NAME psql -U $DB_USERNAME -d $DB_NAME < $BACKUP_FILE"
else
    echo -e "${RED}❌ Erreur lors de la création de la sauvegarde${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi
