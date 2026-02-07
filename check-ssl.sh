#!/bin/bash

echo "🔒 Vérification de la configuration SSL/TLS"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "1. Vérification des conteneurs Traefik:"
docker ps | grep traefik || echo -e "${YELLOW}⚠️  Aucun conteneur Traefik trouvé${NC}"

echo ""
echo "2. Vérification des labels Traefik sur les conteneurs:"
echo ""
echo "Frontend:"
docker inspect nunaheritage-frontend --format='{{range .Config.Labels}}{{.}}{{"\n"}}{{end}}' | grep traefik || echo -e "${YELLOW}⚠️  Aucun label Traefik trouvé${NC}"

echo ""
echo "Backend:"
docker inspect nunaheritage-backend --format='{{range .Config.Labels}}{{.}}{{"\n"}}{{end}}' | grep traefik || echo -e "${YELLOW}⚠️  Aucun label Traefik trouvé${NC}"

echo ""
echo "3. Vérification des logs Traefik (dernières lignes):"
echo ""
TRAEFIK_CONTAINER=$(docker ps --format "{{.Names}}" | grep traefik | head -1)
if [ -n "$TRAEFIK_CONTAINER" ]; then
    echo "Conteneur Traefik: $TRAEFIK_CONTAINER"
    echo "Logs SSL/TLS:"
    docker logs "$TRAEFIK_CONTAINER" 2>&1 | grep -i -E "certificate|ssl|tls|letsencrypt|acme" | tail -10 || echo -e "${YELLOW}⚠️  Aucun log SSL trouvé${NC}"
else
    echo -e "${YELLOW}⚠️  Conteneur Traefik non trouvé${NC}"
fi

echo ""
echo "4. Vérification de la connectivité réseau:"
docker network inspect n8n_default --format='{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null | grep -E "nunaheritage|traefik" || echo -e "${YELLOW}⚠️  Problème de réseau${NC}"

echo ""
echo "5. Pour tester manuellement les certificats:"
echo "   curl -vI https://nunaaheritage.aito-flow.com"
echo "   curl -vI https://api.nunaaheritage.aito-flow.com/api"

echo ""
echo -e "${GREEN}📝 Note: Les certificats Let's Encrypt peuvent prendre quelques minutes à être générés${NC}"
echo "   Si le problème persiste, vérifiez :"
echo "   - Que les domaines pointent bien vers votre serveur"
echo "   - Que les ports 80 et 443 sont ouverts"
echo "   - Les logs Traefik: docker logs $TRAEFIK_CONTAINER"
