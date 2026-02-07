#!/bin/bash

set -e

echo "🌱 Lancement des seeds de la base de données"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Vérifier que le conteneur backend est en cours d'exécution
if ! docker ps | grep -q "nunaheritage-backend"; then
    echo -e "${YELLOW}⚠️  Le conteneur backend n'est pas en cours d'exécution${NC}"
    echo "Démarrez d'abord les conteneurs avec: docker compose up -d"
    exit 1
fi

# Charger les variables d'environnement
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

echo -e "${GREEN}📦 Exécution des seeds...${NC}"

# Exécuter les seeds dans le conteneur backend
docker exec -it nunaheritage-backend npm run seed

echo ""
echo -e "${GREEN}✅ Seeds terminés!${NC}"
echo ""
echo "Les données suivantes ont été créées :"
echo "  - Utilisateurs (admin, users)"
echo "  - Articles de blog"
echo "  - Locations"
echo "  - Catégories"
echo "  - Listings marketplace"
echo "  - Culture videos"
