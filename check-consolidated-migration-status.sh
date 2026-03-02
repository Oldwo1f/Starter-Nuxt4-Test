#!/bin/bash

# Script pour vérifier UNIQUEMENT les migrations de ce commit (consolidated_migration_2026.sql)
# Ne vérifie pas les migrations plus anciennes

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Vérification des migrations consolidées (commit actuel)${NC}"
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

echo -e "${BLUE}📋 Vérification des migrations de ce commit:${NC}"
echo ""

# Migration 1: Table todos
echo -e "${YELLOW}1. Migration: Table todos${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_table "todos"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    # Vérifier les colonnes importantes
    check_column "todos" "status" > /dev/null 2>&1 && \
        echo -e "  ${GREEN}✅${NC} Colonne status existe" || \
        echo -e "  ${YELLOW}⚠️${NC}  Colonne status manquante"
    check_column "todos" "assignedTo" > /dev/null 2>&1 && \
        echo -e "  ${GREEN}✅${NC} Colonne assignedTo existe" || \
        echo -e "  ${YELLOW}⚠️${NC}  Colonne assignedTo manquante"
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Migration 2: Table stripe_payments
echo -e "${YELLOW}2. Migration: Table stripe_payments${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_table "stripe_payments"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    # Vérifier les colonnes importantes
    check_column "stripe_payments" "stripeSessionId" > /dev/null 2>&1 && \
        echo -e "  ${GREEN}✅${NC} Colonne stripeSessionId existe" || \
        echo -e "  ${YELLOW}⚠️${NC}  Colonne stripeSessionId manquante"
    check_column "stripe_payments" "status" > /dev/null 2>&1 && \
        echo -e "  ${GREEN}✅${NC} Colonne status existe" || \
        echo -e "  ${YELLOW}⚠️${NC}  Colonne status manquante"
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Migration 3: Table legacy_payment_verifications
echo -e "${YELLOW}3. Migration: Table legacy_payment_verifications${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_table "legacy_payment_verifications"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    # Vérifier les colonnes importantes
    check_column "legacy_payment_verifications" "paidWith" > /dev/null 2>&1 && \
        echo -e "  ${GREEN}✅${NC} Colonne paidWith existe" || \
        echo -e "  ${YELLOW}⚠️${NC}  Colonne paidWith manquante"
    check_column "legacy_payment_verifications" "pupuInscriptionReceived" > /dev/null 2>&1 && \
        echo -e "  ${GREEN}✅${NC} Colonne pupuInscriptionReceived existe" || \
        echo -e "  ${YELLOW}⚠️${NC}  Colonne pupuInscriptionReceived manquante"
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Migration 4: Colonne isSearching dans listings
echo -e "${YELLOW}4. Migration: Colonne isSearching dans listings${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_column "listings" "isSearching"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Migration 5: Colonnes de profil utilisateur (phoneNumber, commune, contactPreferences, tradingPreferences)
echo -e "${YELLOW}5. Migration: Colonnes de profil utilisateur${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
PHONE_OK=false
COMMUNE_OK=false
CONTACT_PREFS_OK=false
TRADING_PREFS_OK=false

if check_column "users" "phoneNumber" > /dev/null 2>&1; then
    PHONE_OK=true
    echo -e "  ${GREEN}✅${NC} Colonne users.phoneNumber existe"
else
    echo -e "  ${RED}❌${NC} Colonne users.phoneNumber MANQUANTE"
fi

if check_column "users" "commune" > /dev/null 2>&1; then
    COMMUNE_OK=true
    echo -e "  ${GREEN}✅${NC} Colonne users.commune existe"
else
    echo -e "  ${RED}❌${NC} Colonne users.commune MANQUANTE"
fi

if check_column "users" "contactPreferences" > /dev/null 2>&1; then
    CONTACT_PREFS_OK=true
    echo -e "  ${GREEN}✅${NC} Colonne users.contactPreferences existe"
else
    echo -e "  ${RED}❌${NC} Colonne users.contactPreferences MANQUANTE"
fi

if check_column "users" "tradingPreferences" > /dev/null 2>&1; then
    TRADING_PREFS_OK=true
    echo -e "  ${GREEN}✅${NC} Colonne users.tradingPreferences existe"
else
    echo -e "  ${RED}❌${NC} Colonne users.tradingPreferences MANQUANTE"
fi

if [ "$PHONE_OK" = true ] && [ "$COMMUNE_OK" = true ] && [ "$CONTACT_PREFS_OK" = true ] && [ "$TRADING_PREFS_OK" = true ]; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Résumé
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Résumé des migrations de ce commit:${NC}"
echo -e "  Total vérifié: $TOTAL_CHECKS"
echo -e "  ${GREEN}✅ Réussies: $PASSED_CHECKS${NC}"
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "  ${RED}❌ Manquantes: $FAILED_CHECKS${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Action requise:${NC}"
    echo "  Exécutez la migration consolidée avec:"
    echo "    ./run-consolidated-migration.sh"
    exit 1
else
    echo -e "  ${GREEN}✅ Toutes les migrations de ce commit sont appliquées!${NC}"
    echo ""
    echo -e "${BLUE}ℹ️  Note:${NC} Ce script vérifie uniquement les migrations de ce commit."
    echo -e "   Pour vérifier toutes les migrations, utilisez: ./check-migrations-status.sh"
    exit 0
fi
