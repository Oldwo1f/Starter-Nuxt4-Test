#!/bin/bash

set -e

echo "🚀 Déploiement de Nuna Heritage"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

# Vérifier Docker Compose (nouvelle version: docker compose ou ancienne: docker-compose)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Le fichier .env n'existe pas${NC}"
    echo "Création du fichier .env à partir de .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Veuillez éditer le fichier .env avec vos valeurs avant de continuer${NC}"
        exit 1
    else
        echo -e "${RED}❌ Le fichier .env.example n'existe pas${NC}"
        exit 1
    fi
fi

# Charger les variables d'environnement
set -a
source .env
set +a

# Vérifier que le réseau Traefik existe (utiliser la valeur du .env ou la valeur par défaut)
TRAEFIK_NETWORK=${TRAEFIK_NETWORK:-n8n_default}
echo "🔍 Utilisation du réseau Traefik: $TRAEFIK_NETWORK"
if ! docker network ls | grep -q "$TRAEFIK_NETWORK"; then
    echo -e "${YELLOW}⚠️  Le réseau Docker '$TRAEFIK_NETWORK' n'existe pas${NC}"
    echo "Vérifiez le nom de votre réseau Traefik avec: docker network ls"
    echo "Ajustez la variable TRAEFIK_NETWORK dans votre fichier .env si nécessaire"
    exit 1
fi

# Vérifier que le réseau nunaheritage-network existe, sinon le créer
if ! docker network ls | grep -q "nunaheritage-network"; then
    echo "Création du réseau Docker 'nunaheritage-network'..."
    docker network create nunaheritage-network
fi

# Construire les images
echo -e "${GREEN}📦 Construction des images Docker...${NC}"
$DOCKER_COMPOSE_CMD build --no-cache

# Arrêter les conteneurs existants
echo -e "${GREEN}🛑 Arrêt des conteneurs existants...${NC}"
$DOCKER_COMPOSE_CMD down

# Démarrer les services
echo -e "${GREEN}🚀 Démarrage des services...${NC}"
$DOCKER_COMPOSE_CMD up -d

# Attendre que les services soient prêts
echo -e "${GREEN}⏳ Attente du démarrage des services...${NC}"
sleep 10

# Vérifier l'état des conteneurs
echo -e "${GREEN}📊 État des conteneurs:${NC}"
$DOCKER_COMPOSE_CMD ps

echo ""
echo -e "${GREEN}✅ Déploiement terminé!${NC}"
echo ""
echo "Services disponibles:"
echo "  - Frontend: https://nunaaheritage.aito-flow.com"
echo "  - Backend API: https://api.nunaaheritage.aito-flow.com"
echo "  - Swagger: https://api.nunaaheritage.aito-flow.com/api"
echo ""
echo "Pour voir les logs:"
echo "  $DOCKER_COMPOSE_CMD logs -f"
echo ""
echo "Pour arrêter les services:"
echo "  $DOCKER_COMPOSE_CMD down"
