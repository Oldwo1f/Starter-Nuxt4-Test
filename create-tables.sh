#!/bin/bash

set -e

echo "🔧 Création des tables partners et goodies..."

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Vérifier que le conteneur postgres est en cours d'exécution
if ! docker ps | grep -q "nunaheritage-postgres"; then
    echo -e "${RED}❌ Le conteneur postgres n'est pas en cours d'exécution${NC}"
    echo "Démarrez d'abord les conteneurs avec: docker compose up -d"
    exit 1
fi

# Charger les variables d'environnement
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

DB_NAME=${DB_NAME:-nunaheritage}
DB_USERNAME=${DB_USERNAME:-postgres}

echo -e "${YELLOW}📦 Création des tables...${NC}"

# Exécuter le script SQL
docker exec -i nunaheritage-postgres psql -U ${DB_USERNAME} -d ${DB_NAME} < create-partners-goodies-tables.sql

echo ""
echo -e "${GREEN}✅ Tables créées avec succès!${NC}"
echo ""
echo "Vérification des tables:"
docker exec -it nunaheritage-postgres psql -U ${DB_USERNAME} -d ${DB_NAME} -c "\dt" | grep -E "(partners|goodies)"

echo ""
echo -e "${YELLOW}💡 Maintenant, exécutez les seeds pour remplir les tables:${NC}"
echo "   ./run-seeds.sh"
