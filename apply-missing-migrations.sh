#!/bin/bash

# Script pour appliquer les migrations manquantes directement via SQL
# Utilise les fichiers SQL dans backend/migrations/

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Application des migrations manquantes${NC}"
echo ""

# Charger les variables d'environnement
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Valeurs par défaut
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-nunaheritage}
CONTAINER_NAME="nunaheritage-postgres"

# Vérifier que le conteneur est en cours d'exécution
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ Le conteneur PostgreSQL '$CONTAINER_NAME' n'est pas en cours d'exécution${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Connexion à la base de données: $DB_NAME${NC}"
echo ""

# Migration 1: accessLevel dans goodies
echo -e "${YELLOW}1. Migration: accessLevel dans goodies${NC}"
if [ -f "backend/migrations/update_goodies_access_level.sql" ]; then
    docker exec -e PGPASSWORD="$DB_PASSWORD" -i "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" < backend/migrations/update_goodies_access_level.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration accessLevel dans goodies terminée${NC}"
    else
        echo -e "${RED}❌ Erreur lors de la migration accessLevel dans goodies${NC}"
    fi
else
    echo -e "${RED}❌ Fichier backend/migrations/update_goodies_access_level.sql non trouvé${NC}"
fi
echo ""

# Migration 2: accessLevel dans courses
echo -e "${YELLOW}2. Migration: accessLevel dans courses${NC}"
if [ -f "backend/migrations/add_access_level_to_courses.sql" ]; then
    docker exec -e PGPASSWORD="$DB_PASSWORD" -i "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" < backend/migrations/add_access_level_to_courses.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration accessLevel dans courses terminée${NC}"
    else
        echo -e "${RED}❌ Erreur lors de la migration accessLevel dans courses${NC}"
    fi
else
    echo -e "${RED}❌ Fichier backend/migrations/add_access_level_to_courses.sql non trouvé${NC}"
fi
echo ""

# Migration 3: paidAccessExpiresAt et bank_transfer_payments
echo -e "${YELLOW}3. Migration: paidAccessExpiresAt dans users et table bank_transfer_payments${NC}"
if [ -f "backend/migrations/add_paid_access_and_bank_transfer_payments.sql" ]; then
    docker exec -e PGPASSWORD="$DB_PASSWORD" -i "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" < backend/migrations/add_paid_access_and_bank_transfer_payments.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration paidAccessExpiresAt et bank_transfer_payments terminée${NC}"
    else
        echo -e "${RED}❌ Erreur lors de la migration paidAccessExpiresAt et bank_transfer_payments${NC}"
    fi
else
    echo -e "${RED}❌ Fichier backend/migrations/add_paid_access_and_bank_transfer_payments.sql non trouvé${NC}"
fi
echo ""

# Vérification finale
echo -e "${BLUE}✅ Vérification finale...${NC}"
if [ -f "./check-migrations-status.sh" ]; then
    ./check-migrations-status.sh
else
    echo -e "${YELLOW}⚠️  Script de vérification non trouvé${NC}"
fi
