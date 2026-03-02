#!/bin/bash

# Script pour exécuter la migration consolidée sur le serveur
# Regroupe toutes les migrations de ce commit en un seul script

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Exécution de la migration consolidée${NC}"
echo -e "${BLUE}==========================================${NC}"
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
echo -e "${BLUE}   Utilisateur: $DB_USERNAME${NC}"
echo ""

# Vérifier que le fichier de migration existe
MIGRATION_FILE="backend/migrations/consolidated_migration_2026.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Fichier de migration non trouvé: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Contenu de la migration:${NC}"
echo "   - Création de la table todos"
echo "   - Création de la table stripe_payments"
echo "   - Création de la table legacy_payment_verifications"
echo "   - Création de la table refresh_tokens"
echo "   - Ajout de la colonne isSearching à listings"
echo "   - Ajout des colonnes phoneNumber, commune, contactPreferences, tradingPreferences à users"
echo "   - Restauration du rôle superadmin"
echo ""

# Demander confirmation (optionnel - peut être commenté pour exécution automatique)
read -p "Voulez-vous continuer? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration annulée${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Exécution de la migration...${NC}"
echo ""

# Copier le fichier dans le conteneur pour éviter les problèmes de stdin
echo -e "${BLUE}📋 Copie du fichier de migration dans le conteneur...${NC}"
docker cp "$MIGRATION_FILE" "$CONTAINER_NAME:/tmp/migration.sql" 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la copie du fichier dans le conteneur${NC}"
    exit 1
fi

# Exécuter la migration et capturer la sortie complète
echo -e "${BLUE}🔄 Exécution de la migration SQL...${NC}"
OUTPUT=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    psql -U "$DB_USERNAME" -d "$DB_NAME" -v ON_ERROR_STOP=1 -a -f /tmp/migration.sql 2>&1)
EXIT_CODE=$?

# Afficher la sortie
echo "$OUTPUT"
echo ""

# Nettoyer le fichier temporaire
docker exec "$CONTAINER_NAME" rm -f /tmp/migration.sql 2>/dev/null || true

# Vérifier le code de sortie ET la présence des tables
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${BLUE}📊 Vérification des tables créées:${NC}"
    
    # Vérifier les tables et colonnes
    VERIFICATION_OUTPUT=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c "
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
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refresh_tokens') 
                THEN '✅' ELSE '❌' END || ' refresh_tokens' AS status
        UNION ALL
        SELECT 
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'isSearching') 
                THEN '✅' ELSE '❌' END || ' listings.isSearching' AS status
        UNION ALL
        SELECT 
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phoneNumber') 
                THEN '✅' ELSE '❌' END || ' users.phoneNumber' AS status
        UNION ALL
        SELECT 
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'commune') 
                THEN '✅' ELSE '❌' END || ' users.commune' AS status
        UNION ALL
        SELECT 
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'contactPreferences') 
                THEN '✅' ELSE '❌' END || ' users.contactPreferences' AS status
        UNION ALL
        SELECT 
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tradingPreferences') 
                THEN '✅' ELSE '❌' END || ' users.tradingPreferences' AS status;
    " 2>&1)
    
    echo "$VERIFICATION_OUTPUT"
    echo ""
    
    # Vérifier si toutes les tables existent
    if echo "$VERIFICATION_OUTPUT" | grep -q "❌"; then
        echo -e "${RED}❌ Erreur: Certaines tables/colonnes n'ont pas été créées${NC}"
        echo -e "${YELLOW}⚠️  La migration a peut-être échoué silencieusement${NC}"
        echo ""
        echo -e "${BLUE}💡 Essayez d'exécuter la migration en mode debug:${NC}"
        echo "   ./run-consolidated-migration-debug.sh"
        exit 1
    else
        echo -e "${GREEN}✅ Migration consolidée exécutée avec succès!${NC}"
        echo -e "${GREEN}✅ Toutes les tables et colonnes ont été créées!${NC}"
        exit 0
    fi
else
    echo ""
    echo -e "${RED}❌ Erreur lors de l'exécution de la migration (code: $EXIT_CODE)${NC}"
    echo -e "${YELLOW}⚠️  Vérifiez les messages d'erreur ci-dessus${NC}"
    exit 1
fi
