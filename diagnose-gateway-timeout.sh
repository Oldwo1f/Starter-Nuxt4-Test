#!/bin/bash

# Script de diagnostic pour les erreurs Gateway Timeout

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Diagnostic Gateway Timeout${NC}"
echo "=================================="
echo ""

# 1. Vérifier l'état des conteneurs
echo -e "${BLUE}1️⃣  État des conteneurs${NC}"
docker ps --filter "name=nunaheritage" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 2. Vérifier que le frontend écoute
echo -e "${BLUE}2️⃣  Vérification que le frontend écoute${NC}"
if docker exec nunaheritage-frontend netstat -tlnp 2>/dev/null | grep -q ":8080"; then
    echo -e "${GREEN}✅ Frontend écoute sur le port 8080${NC}"
    docker exec nunaheritage-frontend netstat -tlnp 2>/dev/null | grep ":8080" || echo "netstat non disponible, test avec wget..."
else
    echo -e "${YELLOW}⚠️  Impossible de vérifier avec netstat, test avec wget...${NC}"
fi

# Test depuis l'intérieur du conteneur
echo "Test depuis l'intérieur du conteneur frontend:"
docker exec nunaheritage-frontend wget -q -O- --timeout=3 http://localhost:8080 2>&1 | head -5 || echo -e "${RED}❌ Le frontend ne répond pas en interne${NC}"
echo ""

# 3. Vérifier les réseaux Docker
echo -e "${BLUE}3️⃣  Vérification des réseaux Docker${NC}"
TRAEFIK_NETWORK=${TRAEFIK_NETWORK:-n8n_default}
echo "Réseau Traefik attendu: $TRAEFIK_NETWORK"

if docker network ls | grep -q "$TRAEFIK_NETWORK"; then
    echo -e "${GREEN}✅ Réseau $TRAEFIK_NETWORK existe${NC}"
    
    # Vérifier que le frontend est sur le réseau
    if docker network inspect "$TRAEFIK_NETWORK" 2>/dev/null | grep -q "nunaheritage-frontend"; then
        echo -e "${GREEN}✅ Frontend est sur le réseau $TRAEFIK_NETWORK${NC}"
    else
        echo -e "${RED}❌ Frontend n'est PAS sur le réseau $TRAEFIK_NETWORK${NC}"
    fi
else
    echo -e "${RED}❌ Réseau $TRAEFIK_NETWORK n'existe pas${NC}"
    echo "Réseaux disponibles:"
    docker network ls | grep -E "traefik|n8n|nunaheritage"
fi
echo ""

# 4. Trouver et vérifier Traefik
echo -e "${BLUE}4️⃣  Vérification de Traefik${NC}"
TRAEFIK_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i traefik | head -1)

if [ -z "$TRAEFIK_CONTAINER" ]; then
    echo -e "${RED}❌ Aucun conteneur Traefik trouvé${NC}"
    echo "Conteneurs en cours d'exécution:"
    docker ps --format "{{.Names}}"
else
    echo -e "${GREEN}✅ Traefik trouvé: $TRAEFIK_CONTAINER${NC}"
    
    # Vérifier que Traefik peut voir le frontend
    echo "Vérification que Traefik peut résoudre le frontend..."
    docker exec "$TRAEFIK_CONTAINER" ping -c 1 nunaheritage-frontend 2>&1 | head -3 || echo -e "${RED}❌ Traefik ne peut pas ping le frontend${NC}"
    
    # Vérifier que Traefik peut accéder au port du frontend
    echo "Test de connexion depuis Traefik vers le frontend..."
    docker exec "$TRAEFIK_CONTAINER" wget -q -O- --timeout=5 http://nunaheritage-frontend:8080 2>&1 | head -5 || echo -e "${RED}❌ Traefik ne peut pas accéder au frontend sur le port 8080${NC}"
fi
echo ""

# 5. Vérifier les labels Traefik du frontend
echo -e "${BLUE}5️⃣  Vérification des labels Traefik${NC}"
echo "Labels du frontend:"
docker inspect nunaheritage-frontend --format '{{range $key, $value := .Config.Labels}}{{$key}}={{$value}}{{"\n"}}{{end}}' | grep traefik
echo ""

# 6. Vérifier les logs Traefik pour les erreurs
echo -e "${BLUE}6️⃣  Logs Traefik (dernières 30 lignes avec erreurs)${NC}"
if [ -n "$TRAEFIK_CONTAINER" ]; then
    docker logs --tail 30 "$TRAEFIK_CONTAINER" 2>&1 | grep -i -E "error|timeout|nunaheritage-frontend|504|502" || echo "Aucune erreur visible dans les logs Traefik"
else
    echo "Traefik non trouvé, impossible de vérifier les logs"
fi
echo ""

# 7. Vérifier la configuration du backend (si le frontend essaie d'y accéder)
echo -e "${BLUE}7️⃣  Vérification du backend${NC}"
if docker ps | grep -q "nunaheritage-backend"; then
    echo "Test du backend depuis le frontend:"
    docker exec nunaheritage-frontend wget -q -O- --timeout=5 http://backend:8081/api 2>&1 | head -5 || echo -e "${YELLOW}⚠️  Le frontend ne peut pas accéder au backend${NC}"
else
    echo -e "${RED}❌ Le backend n'est pas en cours d'exécution${NC}"
fi
echo ""

# 8. Résumé et recommandations
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Recommandations${NC}"
echo ""
echo "Si le frontend ne répond pas depuis Traefik:"
echo "  1. Vérifiez que le frontend est sur le réseau Traefik:"
echo "     docker network connect $TRAEFIK_NETWORK nunaheritage-frontend"
echo ""
echo "  2. Redémarrez le frontend:"
echo "     docker-compose restart frontend"
echo ""
echo "  3. Vérifiez les logs Traefik en temps réel:"
echo "     docker logs -f $TRAEFIK_CONTAINER"
echo ""
echo "  4. Testez directement le frontend (sans Traefik):"
echo "     docker exec nunaheritage-frontend wget -q -O- http://localhost:8080"
echo ""
