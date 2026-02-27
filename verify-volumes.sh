#!/bin/bash

# Script de vérification des volumes Docker
# Vérifie que les volumes existent et affiche leur taille

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Vérification des volumes Docker${NC}"
echo ""

# Vérifier Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

# Obtenir le nom du projet (basé sur le répertoire)
PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
VOLUME_PREFIX="${PROJECT_NAME}_"

echo "Nom du projet détecté: $PROJECT_NAME"
echo "Préfixe des volumes: $VOLUME_PREFIX"
echo ""

# Volumes attendus
EXPECTED_VOLUMES=("postgres_data" "backend_uploads")

echo -e "${BLUE}📦 Volumes attendus:${NC}"
for volume in "${EXPECTED_VOLUMES[@]}"; do
    FULL_VOLUME_NAME="${VOLUME_PREFIX}${volume}"
    if docker volume ls | grep -q "$FULL_VOLUME_NAME"; then
        VOLUME_SIZE=$(docker system df -v | grep "$FULL_VOLUME_NAME" | awk '{print $3}' || echo "N/A")
        echo -e "  ${GREEN}✅${NC} $FULL_VOLUME_NAME (Taille: $VOLUME_SIZE)"
    else
        echo -e "  ${YELLOW}⚠️${NC} $FULL_VOLUME_NAME (n'existe pas encore)"
    fi
done

echo ""
echo -e "${BLUE}📊 Tous les volumes du projet:${NC}"
docker volume ls | grep "$VOLUME_PREFIX" || echo "Aucun volume trouvé"

echo ""
echo -e "${BLUE}💡 Informations importantes:${NC}"
echo "  - Les volumes Docker persistent les données même après 'docker-compose down'"
echo "  - Utilisez 'docker-compose down' (SANS -v) pour préserver les volumes"
echo "  - Utilisez 'docker-compose down -v' UNIQUEMENT si vous voulez supprimer les volumes"
echo ""
echo -e "${YELLOW}⚠️  ATTENTION: 'docker-compose down -v' supprimera TOUTES les données!${NC}"
