#!/bin/bash

# Script pour vérifier l'état des migrations de la base de données
# Vérifie que toutes les migrations importantes ont été appliquées

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Vérification de l'état des migrations de la base de données${NC}"
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

# Fonction pour vérifier l'existence d'une colonne
check_column() {
    local table=$1
    local column=$2
    local result=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$column';" 2>/dev/null | tr -d ' ')
    
    if [ "$result" = "1" ]; then
        echo -e "  ${GREEN}✅${NC} Colonne $table.$column existe"
        return 0
    else
        echo -e "  ${RED}❌${NC} Colonne $table.$column MANQUANTE"
        return 1
    fi
}

# Fonction pour vérifier l'existence d'une table
check_table() {
    local table=$1
    local result=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" 2>/dev/null | tr -d ' ')
    
    if [ "$result" = "1" ]; then
        echo -e "  ${GREEN}✅${NC} Table $table existe"
        return 0
    else
        echo -e "  ${RED}❌${NC} Table $table MANQUANTE"
        return 1
    fi
}

# Compteurs
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

echo -e "${BLUE}📋 Vérification des migrations récentes:${NC}"
echo ""

# Migration 1: fileUrl dans goodies
echo -e "${YELLOW}1. Migration: fileUrl dans goodies${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_column "goodies" "fileUrl"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Migration 2: accessLevel dans goodies (remplace isPublic)
echo -e "${YELLOW}2. Migration: accessLevel dans goodies${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_column "goodies" "accessLevel"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    # Vérifier que isPublic n'existe plus (si la migration est complète)
    is_public_exists=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'goodies' AND column_name = 'isPublic';" 2>/dev/null | tr -d ' ')
    if [ "$is_public_exists" = "0" ]; then
        echo -e "  ${GREEN}✅${NC} Ancienne colonne isPublic correctement supprimée"
    else
        echo -e "  ${YELLOW}⚠️${NC}  Ancienne colonne isPublic existe encore (migration partielle)"
    fi
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Migration 3: accessLevel dans courses
echo -e "${YELLOW}3. Migration: accessLevel dans courses${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_column "courses" "accessLevel"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Migration 4: paidAccessExpiresAt dans users
echo -e "${YELLOW}4. Migration: paidAccessExpiresAt dans users${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_column "users" "paidAccessExpiresAt"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Migration 5: Table bank_transfer_payments
echo -e "${YELLOW}5. Migration: Table bank_transfer_payments${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_table "bank_transfer_payments"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    # Vérifier les colonnes importantes
    check_column "bank_transfer_payments" "needsVerification" > /dev/null 2>&1 && \
        echo -e "  ${GREEN}✅${NC} Colonne needsVerification existe" || \
        echo -e "  ${YELLOW}⚠️${NC}  Colonne needsVerification manquante"
    check_column "bank_transfer_payments" "pupuInscriptionReceived" > /dev/null 2>&1 && \
        echo -e "  ${GREEN}✅${NC} Colonne pupuInscriptionReceived existe" || \
        echo -e "  ${YELLOW}⚠️${NC}  Colonne pupuInscriptionReceived manquante"
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Migration 6: videoUrl dans videos
echo -e "${YELLOW}6. Migration: videoUrl dans videos${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_column "videos" "videoUrl"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Résumé
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Résumé:${NC}"
echo -e "  Total vérifié: $TOTAL_CHECKS"
echo -e "  ${GREEN}✅ Réussies: $PASSED_CHECKS${NC}"
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "  ${RED}❌ Manquantes: $FAILED_CHECKS${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Action requise:${NC}"
    echo "  Exécutez les migrations manquantes avec:"
    echo "    ./run-all-migrations.sh"
    echo "  Ou exécutez les migrations individuelles depuis le conteneur backend:"
    echo "    docker exec -it nunaheritage-backend npm run migrate:..."
    exit 1
else
    echo -e "  ${GREEN}✅ Toutes les migrations sont appliquées!${NC}"
    exit 0
fi
