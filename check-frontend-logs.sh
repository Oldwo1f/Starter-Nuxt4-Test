#!/bin/bash

# Script pour voir les logs du frontend et diagnostiquer les problèmes

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="nunaheritage-frontend"

echo -e "${BLUE}🔍 Diagnostic des logs du frontend${NC}"
echo ""

# Vérifier que le conteneur existe
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Le conteneur '$CONTAINER_NAME' n'existe pas${NC}"
    exit 1
fi

# Vérifier que le conteneur est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}⚠️  Le conteneur '$CONTAINER_NAME' n'est pas en cours d'exécution${NC}"
    echo ""
    echo "État du conteneur:"
    docker ps -a --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "Pour démarrer le conteneur:"
    echo "  docker-compose up -d frontend"
    exit 1
fi

echo -e "${GREEN}✅ Conteneur en cours d'exécution${NC}"
echo ""

# Menu interactif
echo "Choisissez une option:"
echo "  1) Voir les logs en temps réel (suivre)"
echo "  2) Voir les 100 dernières lignes"
echo "  3) Voir les 50 dernières lignes (erreurs uniquement)"
echo "  4) Voir toutes les erreurs"
echo "  5) Vérifier l'état du conteneur"
echo "  6) Tester la connectivité interne"
echo ""

read -p "Votre choix (1-6, ou Entrée pour option 1): " choice
choice=${choice:-1}

case $choice in
    1)
        echo -e "${BLUE}📋 Logs en temps réel (Ctrl+C pour quitter)${NC}"
        echo ""
        docker logs -f "$CONTAINER_NAME"
        ;;
    2)
        echo -e "${BLUE}📋 100 dernières lignes des logs${NC}"
        echo ""
        docker logs --tail 100 "$CONTAINER_NAME"
        ;;
    3)
        echo -e "${BLUE}📋 50 dernières lignes (erreurs uniquement)${NC}"
        echo ""
        docker logs --tail 50 "$CONTAINER_NAME" 2>&1 | grep -i -E "error|exception|failed|timeout|cannot|unable|warn" || echo "Aucune erreur visible dans les 50 dernières lignes"
        ;;
    4)
        echo -e "${BLUE}📋 Toutes les erreurs dans les logs${NC}"
        echo ""
        docker logs "$CONTAINER_NAME" 2>&1 | grep -i -E "error|exception|failed|timeout|cannot|unable" | tail -50
        ;;
    5)
        echo -e "${BLUE}📊 État du conteneur${NC}"
        echo ""
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo -e "${BLUE}📊 Informations détaillées${NC}"
        docker inspect "$CONTAINER_NAME" --format '{{json .State}}' | python3 -m json.tool 2>/dev/null || docker inspect "$CONTAINER_NAME" --format '{{json .State}}'
        ;;
    6)
        echo -e "${BLUE}🔌 Test de connectivité interne${NC}"
        echo ""
        echo "Test depuis le conteneur frontend vers le backend..."
        docker exec "$CONTAINER_NAME" wget -q -O- --timeout=5 http://backend:8081/api 2>&1 | head -20 || echo -e "${RED}❌ Impossible de se connecter au backend${NC}"
        echo ""
        echo "Test du port interne du frontend..."
        docker exec "$CONTAINER_NAME" wget -q -O- --timeout=5 http://localhost:8080 2>&1 | head -20 || echo -e "${RED}❌ Le frontend n'écoute pas sur le port 8080${NC}"
        ;;
    *)
        echo -e "${RED}❌ Choix invalide${NC}"
        exit 1
        ;;
esac
