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
echo "   - Ajout de la colonne isSearching à listings"
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

# Exécuter la migration
if docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    psql -U "$DB_USERNAME" -d "$DB_NAME" -f - < "$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}✅ Migration consolidée exécutée avec succès!${NC}"
    echo ""
    echo -e "${BLUE}📊 Vérification des tables créées:${NC}"
    
    # Vérifier les tables
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
    " 2>/dev/null || echo -e "${YELLOW}⚠️  Impossible de vérifier les tables${NC}"
    
    echo ""
    echo -e "${GREEN}✅ Toutes les migrations ont été appliquées!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Erreur lors de l'exécution de la migration${NC}"
    echo -e "${YELLOW}⚠️  Vérifiez les logs ci-dessus pour plus de détails${NC}"
    exit 1
fi
