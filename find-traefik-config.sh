#!/bin/bash

echo "🔍 Recherche de la configuration Traefik"

TRAEFIK_CONTAINER=$(docker ps --format "{{.Names}}" | grep traefik | head -1)

if [ -z "$TRAEFIK_CONTAINER" ]; then
    echo "❌ Conteneur Traefik non trouvé"
    exit 1
fi

echo "Conteneur Traefik: $TRAEFIK_CONTAINER"
echo ""

echo "1. Certificat Resolvers dans la configuration:"
docker exec "$TRAEFIK_CONTAINER" cat /etc/traefik/traefik.yml 2>/dev/null | grep -A 10 -i "certificatesresolvers\|certresolver" || \
docker exec "$TRAEFIK_CONTAINER" cat /etc/traefik/traefik.yaml 2>/dev/null | grep -A 10 -i "certificatesresolvers\|certresolver" || \
echo "⚠️  Fichier de configuration non trouvé dans /etc/traefik/"

echo ""
echo "2. Labels du conteneur Traefik:"
docker inspect "$TRAEFIK_CONTAINER" --format='{{range .Config.Labels}}{{.}}{{"\n"}}{{end}}' | grep -i -E "cert|acme|letsencrypt" || echo "Aucun label trouvé"

echo ""
echo "3. Logs récents mentionnant certificate resolver:"
docker logs "$TRAEFIK_CONTAINER" 2>&1 | grep -i "certresolver\|certificatesresolver" | tail -5 || echo "Aucun log trouvé"

echo ""
echo "4. Vérification des autres conteneurs qui fonctionnent:"
echo "Conteneurs avec des labels Traefik qui fonctionnent:"
docker ps --format "{{.Names}}" | while read container; do
    if docker inspect "$container" --format='{{range .Config.Labels}}{{.}}{{"\n"}}{{end}}' 2>/dev/null | grep -q "traefik.*certresolver"; then
        echo "  - $container:"
        docker inspect "$container" --format='{{range .Config.Labels}}{{.}}{{"\n"}}{{end}}' 2>/dev/null | grep "certresolver" | head -1
    fi
done
