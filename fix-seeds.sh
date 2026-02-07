#!/bin/bash

set -e

echo "🔧 Correction et lancement des seeds"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📦 Reconstruction de l'image backend avec les fichiers source...${NC}"

# Reconstruire l'image backend
docker compose build --no-cache backend

echo -e "${GREEN}✅ Image reconstruite${NC}"

echo -e "${YELLOW}🔄 Redémarrage du conteneur backend...${NC}"

# Redémarrer le conteneur
docker compose up -d backend

# Attendre que le conteneur soit prêt
echo -e "${YELLOW}⏳ Attente du démarrage du conteneur...${NC}"
sleep 5

# Vérifier que les fichiers source sont présents
echo -e "${YELLOW}🔍 Vérification des fichiers source...${NC}"
if docker exec nunaheritage-backend test -d /app/src/database/seeds; then
    echo -e "${GREEN}✅ Fichiers source présents${NC}"
else
    echo -e "${RED}❌ Fichiers source non trouvés${NC}"
    echo "Vérifiez le contenu du conteneur :"
    docker exec nunaheritage-backend ls -la /app/
    exit 1
fi

# Charger les variables d'environnement
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

echo -e "${GREEN}🌱 Lancement des seeds...${NC}"

# Exécuter les seeds
docker exec -it nunaheritage-backend npm run seed

echo ""
echo -e "${GREEN}✅ Seeds terminés avec succès!${NC}"
