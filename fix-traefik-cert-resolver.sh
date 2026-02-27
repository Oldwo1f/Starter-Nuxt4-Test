#!/bin/bash

# Script pour vérifier et corriger le certificate resolver Traefik

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Vérification du certificate resolver Traefik${NC}"
echo ""

# Trouver le conteneur Traefik
TRAEFIK_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i traefik | head -1)

if [ -z "$TRAEFIK_CONTAINER" ]; then
    echo -e "${RED}❌ Aucun conteneur Traefik trouvé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Traefik trouvé: $TRAEFIK_CONTAINER${NC}"
echo ""

# Vérifier les certificate resolvers disponibles dans Traefik
echo -e "${BLUE}📋 Certificate resolvers disponibles dans Traefik:${NC}"
docker logs "$TRAEFIK_CONTAINER" 2>&1 | grep -i "certificate.*resolver\|acme" | head -10 || echo "Aucune information trouvée dans les logs"

echo ""
echo -e "${BLUE}📋 Configuration actuelle dans docker-compose.yml:${NC}"
grep -A 2 "traefik.http.routers.nunaheritage-frontend.tls.certresolver" docker-compose.yml || echo "Non trouvé"

echo ""
echo -e "${BLUE}🔍 Vérification des erreurs dans les logs Traefik:${NC}"
docker logs "$TRAEFIK_CONTAINER" 2>&1 | grep -i "certificate.*resolver\|nonexistent" | tail -5

echo ""
echo -e "${YELLOW}💡 Solutions possibles:${NC}"
echo ""
echo "1. Si Traefik utilise 'letsencrypt' comme resolver:"
echo "   Modifiez docker-compose.yml pour utiliser 'letsencrypt' au lieu de 'mytlschallenge'"
echo ""
echo "2. Si Traefik utilise 'mytlschallenge' comme resolver:"
echo "   Vérifiez que ce resolver est bien configuré dans Traefik"
echo ""
echo "3. Pour trouver le bon nom du resolver, vérifiez la config Traefik:"
echo "   docker exec $TRAEFIK_CONTAINER cat /etc/traefik/traefik.yml | grep -i cert"
echo "   ou"
echo "   docker logs $TRAEFIK_CONTAINER 2>&1 | grep -i 'certificate.*resolver' | head -5"
