#!/bin/bash

# Script pour vérifier que toutes les colonnes des entités sont présentes dans la DB
# Compare les colonnes attendues (depuis les entités) avec celles présentes

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Vérification complète des colonnes des entités${NC}"
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

# Fonction pour vérifier une colonne
check_column() {
    local table=$1
    local column=$2
    local result=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$column';" 2>/dev/null | tr -d ' ')
    
    [ "$result" = "1" ]
}

# Définir toutes les colonnes attendues pour chaque table
declare -A EXPECTED_COLUMNS

# Table users (depuis user.entity.ts)
EXPECTED_COLUMNS[users]="id email password firstName lastName avatarImage role emailVerified emailVerificationToken emailVerificationTokenExpiry isActive lastLogin emailChangedAt paidAccessExpiresAt resetToken resetTokenExpiry facebookId facebookEmail walletBalance referralCode createdAt updatedAt"

# Table goodies (colonnes critiques)
EXPECTED_COLUMNS[goodies]="id fileUrl accessLevel"

# Table courses (colonnes critiques)
EXPECTED_COLUMNS[courses]="id accessLevel"

# Table videos (colonnes critiques)
EXPECTED_COLUMNS[videos]="id videoUrl"

# Table bank_transfer_payments (colonnes critiques)
EXPECTED_COLUMNS[bank_transfer_payments]="id userId needsVerification pupuInscriptionReceived"

# Table referrals (système de parrainage)
EXPECTED_COLUMNS[referrals]="id referrerId referredId status createdAt updatedAt"

# Table transactions (utilisée par le système de parrainage)
EXPECTED_COLUMNS[transactions]="id type amount balanceBefore balanceAfter status fromUserId toUserId"

TOTAL_MISSING=0

# Vérifier chaque table
for table in "${!EXPECTED_COLUMNS[@]}"; do
    echo -e "${BLUE}📋 Table: $table${NC}"
    
    # Vérifier si la table existe
    table_exists=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" 2>/dev/null | tr -d ' ')
    
    if [ "$table_exists" != "1" ]; then
        echo -e "  ${RED}❌ Table $table n'existe pas${NC}"
        TOTAL_MISSING=$((TOTAL_MISSING + 1))
        echo ""
        continue
    fi
    
    # Vérifier chaque colonne
    missing_cols=()
    for column in ${EXPECTED_COLUMNS[$table]}; do
        if ! check_column "$table" "$column"; then
            missing_cols+=("$column")
        fi
    done
    
    if [ ${#missing_cols[@]} -eq 0 ]; then
        echo -e "  ${GREEN}✅ Toutes les colonnes critiques sont présentes${NC}"
    else
        echo -e "  ${RED}❌ Colonnes manquantes:${NC}"
        for col in "${missing_cols[@]}"; do
            echo -e "    - $col"
            TOTAL_MISSING=$((TOTAL_MISSING + 1))
        done
    fi
    echo ""
done

# Résumé
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $TOTAL_MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ Toutes les colonnes critiques sont présentes!${NC}"
    exit 0
else
    echo -e "${RED}❌ $TOTAL_MISSING colonne(s) manquante(s)${NC}"
    echo ""
    echo -e "${YELLOW}💡 Pour appliquer les migrations manquantes:${NC}"
    echo "  ./apply-missing-migrations.sh"
    echo ""
    echo -e "${YELLOW}💡 Pour vérifier l'état des migrations:${NC}"
    echo "  ./check-migrations-status.sh"
    exit 1
fi
