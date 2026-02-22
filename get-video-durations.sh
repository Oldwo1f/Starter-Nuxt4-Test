#!/bin/bash

set -e

echo "🔍 Récupération des durées des vidéos depuis la base de données"
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

echo -e "${GREEN}📊 Récupération des durées...${NC}"
echo ""

# Exécuter le script dans le conteneur (il est déjà dans le code source)
docker exec -it nunaheritage-backend sh -c "
  cd /app && \
  npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register src/database/scripts/get-video-durations-from-db.ts
"

# Copier les rapports générés depuis le conteneur
if docker exec nunaheritage-backend test -f /app/video-durations-report.json; then
    docker cp nunaheritage-backend:/app/video-durations-report.json ./video-durations-report.json
    echo -e "${GREEN}✅ Rapport JSON copié dans: ./video-durations-report.json${NC}"
fi

if docker exec nunaheritage-backend test -f /app/video-durations-report.csv; then
    docker cp nunaheritage-backend:/app/video-durations-report.csv ./video-durations-report.csv
    echo -e "${GREEN}✅ Rapport CSV copié dans: ./video-durations-report.csv${NC}"
fi

echo ""
echo -e "${GREEN}✅ Récupération terminée!${NC}"
