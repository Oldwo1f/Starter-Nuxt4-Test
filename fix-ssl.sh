#!/bin/bash

echo "🔒 Correction de la configuration SSL"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Recherche du nom correct du certificat resolver...${NC}"

# Vérifier les conteneurs qui fonctionnent
WORKING_CONTAINER=""
for container in perfectgenerations-frontend perfectgenerations-backend; do
    if docker ps --format "{{.Names}}" | grep -q "$container"; then
        WORKING_CONTAINER="$container"
        break
    fi
done

if [ -z "$WORKING_CONTAINER" ]; then
    echo -e "${RED}❌ Aucun conteneur de référence trouvé${NC}"
    echo "Veuillez exécuter manuellement:"
    echo "  docker inspect perfectgenerations-frontend | grep certresolver"
    exit 1
fi

echo "Conteneur de référence: $WORKING_CONTAINER"
CERT_RESOLVER=$(docker inspect "$WORKING_CONTAINER" --format='{{range .Config.Labels}}{{.}}{{"\n"}}{{end}}' 2>/dev/null | grep "traefik.*certresolver" | sed 's/.*certresolver=\([^ ]*\).*/\1/' | head -1)

if [ -z "$CERT_RESOLVER" ]; then
    echo -e "${YELLOW}⚠️  Certificat resolver non trouvé dans les labels${NC}"
    echo "Vérification dans les logs Traefik..."
    TRAEFIK_CONTAINER=$(docker ps --format "{{.Names}}" | grep traefik | head -1)
    if [ -n "$TRAEFIK_CONTAINER" ]; then
        CERT_RESOLVER=$(docker logs "$TRAEFIK_CONTAINER" 2>&1 | grep -i "certificatesresolvers" | head -1 | sed 's/.*certificatesresolvers\.\([^.]*\).*/\1/' | head -1)
    fi
fi

if [ -z "$CERT_RESOLVER" ]; then
    echo -e "${YELLOW}⚠️  Impossible de déterminer automatiquement le certificat resolver${NC}"
    echo "Veuillez vérifier manuellement et mettre à jour docker-compose.yml"
    echo ""
    echo "Commandes utiles:"
    echo "  docker inspect $WORKING_CONTAINER | grep certresolver"
    echo "  docker logs n8n-traefik-1 | grep -i certificatesresolvers"
    exit 1
fi

echo -e "${GREEN}✅ Certificat resolver trouvé: $CERT_RESOLVER${NC}"

# Mettre à jour docker-compose.yml
echo -e "${YELLOW}📝 Mise à jour de docker-compose.yml...${NC}"

# Créer une sauvegarde
cp docker-compose.yml docker-compose.yml.backup

# Remplacer letsencrypt par le bon nom
sed -i "s/certresolver=letsencrypt/certresolver=$CERT_RESOLVER/g" docker-compose.yml

echo -e "${GREEN}✅ docker-compose.yml mis à jour${NC}"
echo ""
echo "Redémarrage des conteneurs..."
docker compose up -d

echo ""
echo -e "${GREEN}✅ Configuration SSL corrigée!${NC}"
echo "Le certificat resolver utilisé est maintenant: $CERT_RESOLVER"
