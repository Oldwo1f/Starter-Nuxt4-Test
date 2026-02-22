#!/bin/bash

set -e

echo "🔄 Mise à jour des durées des vidéos depuis les sources réelles"
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

# Vérifier que le fichier existe localement
SCRIPT_PATH="backend/src/database/scripts/update-video-durations-real.ts"
if [ ! -f "$SCRIPT_PATH" ]; then
    echo -e "${YELLOW}❌ Le fichier $SCRIPT_PATH n'existe pas localement${NC}"
    exit 1
fi

# Créer le répertoire dans le conteneur si nécessaire
docker exec nunaheritage-backend mkdir -p /app/src/database/scripts

# Copier le script dans le conteneur
echo -e "${GREEN}📋 Copie du script dans le conteneur...${NC}"
docker cp "$SCRIPT_PATH" nunaheritage-backend:/app/src/database/scripts/update-video-durations-real.ts

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}❌ Erreur lors de la copie du script${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Script copié${NC}"
echo ""

# Vérifier si ffmpeg/ffprobe est disponible dans le conteneur
if docker exec nunaheritage-backend which ffprobe > /dev/null 2>&1 || \
   docker exec nunaheritage-backend which ffmpeg > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ffprobe/ffmpeg disponible dans le conteneur${NC}"
else
    echo -e "${YELLOW}⚠ ffprobe/ffmpeg non disponible dans le conteneur${NC}"
    echo "   Tentative d'installation..."
    if docker exec -u root nunaheritage-backend apk add --no-cache ffmpeg > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ffmpeg installé avec succès${NC}"
    else
        echo -e "${YELLOW}⚠ Échec de l'installation automatique${NC}"
        echo "   Installez manuellement avec: docker exec -u root -it nunaheritage-backend apk add --no-cache ffmpeg"
        echo "   Ou modifiez le Dockerfile pour inclure ffmpeg de manière permanente"
        echo ""
    fi
fi

echo -e "${GREEN}ℹ Les vidéos YouTube seront ignorées (mise à jour manuelle)${NC}"
echo ""

# Exécuter le script dans le conteneur
docker exec -it nunaheritage-backend sh -c "
  cd /app && \
  npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register src/database/scripts/update-video-durations-real.ts
"

echo ""
echo -e "${GREEN}✅ Mise à jour terminée!${NC}"
