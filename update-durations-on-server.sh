#!/bin/bash

set -e

echo "🔄 Mise à jour des durées des vidéos depuis les données locales"
echo ""

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

echo -e "${GREEN}🔄 Mise à jour des durées...${NC}"
echo ""

# Exécuter le script dans le conteneur
docker exec -it nunaheritage-backend sh -c "
  cd /app && \
  npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register src/database/scripts/update-durations-from-local.ts
"

echo ""
echo -e "${GREEN}✅ Mise à jour terminée!${NC}"
