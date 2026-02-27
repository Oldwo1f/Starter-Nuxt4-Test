#!/bin/bash

# Script pour vérifier toutes les colonnes des entités principales
# Compare les colonnes attendues avec celles présentes dans la base de données

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Vérification complète des colonnes de la base de données${NC}"
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
    
    if [ "$result" = "1" ]; then
        return 0
    else
        return 1
    fi
}

# Fonction pour lister toutes les colonnes d'une table
list_columns() {
    local table=$1
    docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c \
        "SELECT column_name FROM information_schema.columns WHERE table_name = '$table' ORDER BY ordinal_position;" 2>/dev/null | tr -d ' ' | grep -v '^$'
}

# Vérification de la table users
echo -e "${BLUE}📋 Table: users${NC}"
echo "Colonnes attendues (depuis user.entity.ts):"
echo "  - id, email, password, firstName, lastName, avatarImage"
echo "  - role, emailVerified, emailVerificationToken, emailVerificationTokenExpiry"
echo "  - isActive, lastLogin, emailChangedAt, paidAccessExpiresAt"
echo "  - resetToken, resetTokenExpiry, facebookId, facebookEmail"
echo "  - walletBalance, referralCode, createdAt, updatedAt"
echo ""

MISSING_COLUMNS=0

# Colonnes critiques à vérifier (celles qui ont été ajoutées récemment ou qui peuvent manquer)
CRITICAL_COLUMNS=(
    "users:paidAccessExpiresAt"
    "users:referralCode"
    "users:walletBalance"
    "users:emailChangedAt"
    "users:facebookId"
    "users:facebookEmail"
)

echo -e "${YELLOW}Vérification des colonnes critiques:${NC}"
for col_spec in "${CRITICAL_COLUMNS[@]}"; do
    IFS=':' read -r table column <<< "$col_spec"
    if check_column "$table" "$column"; then
        echo -e "  ${GREEN}✅${NC} $table.$column"
    else
        echo -e "  ${RED}❌${NC} $table.$column MANQUANTE"
        MISSING_COLUMNS=$((MISSING_COLUMNS + 1))
    fi
done
echo ""

# Vérification de la table goodies
echo -e "${BLUE}📋 Table: goodies${NC}"
GOODIES_COLUMNS=("fileUrl" "accessLevel")
for column in "${GOODIES_COLUMNS[@]}"; do
    if check_column "goodies" "$column"; then
        echo -e "  ${GREEN}✅${NC} goodies.$column"
    else
        echo -e "  ${RED}❌${NC} goodies.$column MANQUANTE"
        MISSING_COLUMNS=$((MISSING_COLUMNS + 1))
    fi
done
echo ""

# Vérification de la table courses
echo -e "${BLUE}📋 Table: courses${NC}"
if check_column "courses" "accessLevel"; then
    echo -e "  ${GREEN}✅${NC} courses.accessLevel"
else
    echo -e "  ${RED}❌${NC} courses.accessLevel MANQUANTE"
    MISSING_COLUMNS=$((MISSING_COLUMNS + 1))
fi
echo ""

# Vérification de la table videos
echo -e "${BLUE}📋 Table: videos${NC}"
if check_column "videos" "videoUrl"; then
    echo -e "  ${GREEN}✅${NC} videos.videoUrl"
else
    echo -e "  ${RED}❌${NC} videos.videoUrl MANQUANTE"
    MISSING_COLUMNS=$((MISSING_COLUMNS + 1))
fi
echo ""

# Vérification de la table bank_transfer_payments
echo -e "${BLUE}📋 Table: bank_transfer_payments${NC}"
if docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bank_transfer_payments';" 2>/dev/null | tr -d ' ' | grep -q "1"; then
    echo -e "  ${GREEN}✅${NC} Table bank_transfer_payments existe"
    
    # Vérifier les colonnes importantes
    BANK_COLUMNS=("needsVerification" "pupuInscriptionReceived")
    for column in "${BANK_COLUMNS[@]}"; do
        if check_column "bank_transfer_payments" "$column"; then
            echo -e "    ${GREEN}✅${NC} bank_transfer_payments.$column"
        else
            echo -e "    ${RED}❌${NC} bank_transfer_payments.$column MANQUANTE"
            MISSING_COLUMNS=$((MISSING_COLUMNS + 1))
        fi
    done
else
    echo -e "  ${RED}❌${NC} Table bank_transfer_payments MANQUANTE"
    MISSING_COLUMNS=$((MISSING_COLUMNS + 1))
fi
echo ""

# Résumé
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $MISSING_COLUMNS -eq 0 ]; then
    echo -e "${GREEN}✅ Toutes les colonnes critiques sont présentes!${NC}"
    exit 0
else
    echo -e "${RED}❌ $MISSING_COLUMNS colonne(s) manquante(s)${NC}"
    echo ""
    echo -e "${YELLOW}💡 Pour appliquer les migrations manquantes:${NC}"
    echo "  ./apply-missing-migrations.sh"
    exit 1
fi
