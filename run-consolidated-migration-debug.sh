#!/bin/bash

# Script de debug pour la migration consolidée
# Affiche les erreurs détaillées

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Mode Debug - Migration Consolidée${NC}"
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

MIGRATION_FILE="backend/migrations/consolidated_migration_2026.sql"

echo -e "${BLUE}📊 Configuration:${NC}"
echo "  Base de données: $DB_NAME"
echo "  Utilisateur: $DB_USERNAME"
echo "  Conteneur: $CONTAINER_NAME"
echo "  Fichier: $MIGRATION_FILE"
echo ""

# Vérifier que le fichier existe
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Fichier non trouvé: $MIGRATION_FILE${NC}"
    exit 1
fi

# Vérifier la connexion
echo -e "${BLUE}🔌 Test de connexion...${NC}"
if docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    psql -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connexion OK${NC}"
else
    echo -e "${RED}❌ Erreur de connexion${NC}"
    exit 1
fi
echo ""

# Afficher les premières lignes du fichier SQL
echo -e "${BLUE}📄 Contenu du fichier SQL (premières 10 lignes):${NC}"
head -10 "$MIGRATION_FILE"
echo ""

# Vérifier que le fichier peut être lu
echo -e "${BLUE}📄 Vérification du fichier SQL...${NC}"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Fichier non trouvé: $MIGRATION_FILE${NC}"
    exit 1
fi
FILE_SIZE=$(wc -c < "$MIGRATION_FILE")
echo "  Taille du fichier: $FILE_SIZE octets"
echo "  Lignes: $(wc -l < "$MIGRATION_FILE")"
echo ""

# Vérifier que le fichier contient BEGIN et COMMIT
if grep -q "BEGIN;" "$MIGRATION_FILE" && grep -q "COMMIT;" "$MIGRATION_FILE"; then
    echo -e "${GREEN}✅ Fichier SQL valide (contient BEGIN et COMMIT)${NC}"
else
    echo -e "${RED}❌ Fichier SQL invalide (manque BEGIN ou COMMIT)${NC}"
fi
echo ""

# Exécuter la migration avec affichage des erreurs et mode verbose
echo -e "${BLUE}🔄 Exécution de la migration...${NC}"
echo -e "${YELLOW}Mode verbose activé pour voir tous les messages SQL${NC}"
echo ""

# Copier le fichier dans le conteneur d'abord pour éviter les problèmes de stdin
docker cp "$MIGRATION_FILE" "$CONTAINER_NAME:/tmp/migration.sql" 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la copie du fichier dans le conteneur${NC}"
    exit 1
fi

# Exécuter depuis le fichier dans le conteneur avec mode verbose
echo -e "${BLUE}Exécution SQL...${NC}"
OUTPUT=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    psql -U "$DB_USERNAME" -d "$DB_NAME" -v ON_ERROR_STOP=1 -a -f /tmp/migration.sql 2>&1)
EXIT_CODE=$?

# Afficher TOUTE la sortie
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Sortie complète de psql:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "$OUTPUT"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Migration exécutée (code: $EXIT_CODE)${NC}"
else
    echo -e "${RED}❌ Erreur lors de l'exécution (code: $EXIT_CODE)${NC}"
fi

# Nettoyer le fichier temporaire
docker exec "$CONTAINER_NAME" rm -f /tmp/migration.sql 2>/dev/null || true

echo ""
echo -e "${BLUE}🔍 Vérification des tables...${NC}"
docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    psql -U "$DB_USERNAME" -d "$DB_NAME" -c "
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'todos') 
        THEN '✅' ELSE '❌' END || ' todos' AS status
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_payments') 
        THEN '✅' ELSE '❌' END || ' stripe_payments' AS status
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legacy_payment_verifications') 
        THEN '✅' ELSE '❌' END || ' legacy_payment_verifications' AS status
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'isSearching') 
        THEN '✅' ELSE '❌' END || ' listings.isSearching' AS status;
" 2>&1
