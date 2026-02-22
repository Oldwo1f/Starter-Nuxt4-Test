#!/bin/bash

set -e

echo "🔄 Mise à jour des durées des vidéos depuis les fichiers"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Vérifier que le conteneur backend est en cours d'exécution
if ! docker ps | grep -q "nunaheritage-backend"; then
    echo -e "${YELLOW}⚠️  Le conteneur backend n'est pas en cours d'exécution${NC}"
    echo "Démarrez d'abord les conteneurs avec: docker compose up -d"
    exit 1
fi

# Vérifier que ffprobe ou ffmpeg est disponible dans le conteneur
if ! docker exec nunaheritage-backend which ffprobe > /dev/null 2>&1 && \
   ! docker exec nunaheritage-backend which ffmpeg > /dev/null 2>&1; then
    echo -e "${RED}❌ ffprobe ou ffmpeg n'est pas disponible dans le conteneur${NC}"
    echo "Installez ffmpeg dans le conteneur pour extraire les durées des vidéos"
    echo ""
    echo "Vous pouvez installer avec:"
    echo "  docker exec -it nunaheritage-backend apk add ffmpeg  # Alpine Linux"
    echo "  ou"
    echo "  docker exec -it nunaheritage-backend apt-get update && apt-get install -y ffmpeg  # Debian/Ubuntu"
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
echo "⚠️  Cette opération va mettre à jour les durées dans la base de données"
read -p "Continuer? (o/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "Opération annulée"
    exit 0
fi

# Exécuter le script dans le conteneur (il est déjà dans le code source)
docker exec -it nunaheritage-backend sh -c "
  cd /app && \
  npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register src/database/scripts/update-video-durations.ts
"

echo ""
echo -e "${GREEN}✅ Mise à jour terminée!${NC}"
